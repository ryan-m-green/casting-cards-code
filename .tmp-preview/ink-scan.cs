using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;

public static class InkScan
{
    public static string Report(string path, int cutoff, int gapCols)
    {
        using (Bitmap src = new Bitmap(path))
        {
            int w = src.Width, h = src.Height;
            bool[] ink = ReadInk(src, w, h, cutoff);
            StringBuilder sb = new StringBuilder();
            sb.Append("source: ").Append(path).Append(" (").Append(w).Append(" x ").Append(h).Append(")\n");

            // rows: count and horizontal extent of ink
            int[] rowCount = new int[h], rowMin = new int[h], rowMax = new int[h];
            for (int y = 0; y < h; y++)
            {
                int c = 0, mn = -1, mx = -1;
                for (int x = 0; x < w; x++)
                {
                    if (!ink[y * w + x]) continue;
                    c++;
                    if (mn < 0) mn = x;
                    mx = x;
                }
                rowCount[y] = c; rowMin[y] = mn; rowMax[y] = mx;
            }

            // bands of occupied rows: a band closes after 3 blank rows
            var bands = new System.Collections.Generic.List<int[]>();
            int start = -1, blank = 0;
            for (int y = 0; y < h; y++)
            {
                if (rowCount[y] >= 2) { if (start < 0) start = y; blank = 0; }
                else if (start >= 0)
                {
                    blank++;
                    if (blank >= 3) { bands.Add(new int[] { start, y - blank }); start = -1; blank = 0; }
                }
            }
            if (start >= 0) bands.Add(new int[] { start, h - 1 });

            int bi = 0;
            foreach (int[] band in bands)
            {
                int y0 = band[0], y1 = band[1];
                int[] cols = new int[w];
                for (int y = y0; y <= y1; y++)
                {
                    if (rowCount[y] < 1) continue;
                    for (int x = rowMin[y]; x <= rowMax[y]; x++)
                        if (ink[y * w + x]) cols[x]++;
                }

                var groups = new System.Collections.Generic.List<int[]>();
                int gs = -1, gap = 0;
                for (int x = 0; x < w; x++)
                {
                    if (cols[x] > 0) { if (gs < 0) gs = x; gap = 0; }
                    else if (gs >= 0)
                    {
                        gap++;
                        if (gap >= gapCols) { groups.Add(new int[] { gs, x - gap }); gs = -1; gap = 0; }
                    }
                }
                if (gs >= 0) groups.Add(new int[] { gs, w - 1 });

                sb.Append("\nband ").Append(bi).Append(": rows ").Append(y0).Append("-").Append(y1)
                  .Append(" (").Append(y1 - y0 + 1).Append("px tall, ").Append(groups.Count).Append(" groups)\n");
                int g = 0;
                foreach (int[] grp in groups)
                {
                    int x0 = grp[0], x1 = grp[1], ty0 = -1, ty1 = -1;
                    for (int y = y0; y <= y1; y++)
                    {
                        bool hit = false;
                        for (int x = x0; x <= x1; x++) if (ink[y * w + x]) { hit = true; break; }
                        if (hit) { if (ty0 < 0) ty0 = y; ty1 = y; }
                    }
                    sb.Append("   group ").Append(g).Append(": x ").Append(x0).Append("-").Append(x1)
                      .Append(" (w ").Append(x1 - x0 + 1).Append("), y ").Append(ty0).Append("-").Append(ty1)
                      .Append(" (h ").Append(ty1 - ty0 + 1).Append(")\n");
                    g++;
                }
                bi++;
            }
            return sb.ToString();
        }
    }

    public static string Zoom(string path, int x0, int y0, int x1, int y1, int factor, string outPath)
    {
        using (Bitmap src = new Bitmap(path))
        {
            int cw = x1 - x0, ch = y1 - y0;
            using (Bitmap crop = new Bitmap(cw * factor, ch * factor))
            {
                using (Graphics g = Graphics.FromImage(crop))
                {
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                    g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
                    g.DrawImage(src, new Rectangle(0, 0, cw * factor, ch * factor),
                                new Rectangle(x0, y0, cw, ch), GraphicsUnit.Pixel);
                }
                crop.Save(outPath, ImageFormat.Png);
            }
            return "zoom written: " + outPath + " (" + (cw * factor) + " x " + (ch * factor) + ")\n";
        }
    }

    private static bool[] ReadInk(Bitmap src, int w, int h, int cutoff)
    {
        BitmapData data = src.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        byte[] bytes = new byte[data.Stride * h];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
        src.UnlockBits(data);
        bool[] ink = new bool[w * h];
        for (int y = 0; y < h; y++)
        {
            int row = y * data.Stride;
            for (int x = 0; x < w; x++)
            {
                int i = row + x * 4;
                ink[y * w + x] = (bytes[i] + bytes[i + 1] + bytes[i + 2]) > cutoff;
            }
        }
        return ink;
    }
}

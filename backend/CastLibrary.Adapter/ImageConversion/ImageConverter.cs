using ImageMagick;

namespace CastLibrary.Adapter.ImageConversion
{
    public interface IImageConverter
    {
        Task<Stream> ConvertToPng(Stream imageStream);
    }
    public class ImageConverter : IImageConverter
    {
        private static bool IsPdf(Stream stream)
        {
            if (!stream.CanSeek || stream.Length < 4) return false;
            var header = new byte[4];
            stream.Read(header, 0, 4);
            stream.Position = 0;
            return header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46; // %PDF
        }

        public async Task<Stream> ConvertToPng(Stream imageStream)
        {
            try
            {
                if (imageStream.CanSeek)
                {
                    imageStream.Position = 0;
                }

                var output = new MemoryStream();
                var isPdf  = IsPdf(imageStream);

                var settings = new MagickReadSettings()
                {
                    ColorSpace      = ColorSpace.sRGB,
                    BackgroundColor = isPdf ? MagickColors.White : MagickColors.Transparent,
                    Density         = isPdf ? new Density(150) : null,
                };

                using (var image = new MagickImage(imageStream, settings))
                {
                    image.AutoOrient();
                    image.Strip();

                    // Resize for web/mobile display
                    image.Resize(new MagickGeometry("800x")); // or "800x" for mobile

                    // Reduce color depth (PNG‑8 palette)
                    image.ColorType = ColorType.Palette;
                    image.Quantize(new QuantizeSettings
                    {
                        Colors = 256,
                        DitherMethod = DitherMethod.No
                    });

                    // Optimize PNG compression
                    image.Settings.SetDefine("png:compression-level", "9");
                    image.Settings.SetDefine("png:compression-filter", "5");

                    image.Format = MagickFormat.Png8;
                    image.Write(output);
                }

                output.Position = 0;

                return output;
            }
            catch(Exception ex)
            {
                throw new InvalidOperationException("Failed to convert image to png.", ex);
            }
        }
    }
}

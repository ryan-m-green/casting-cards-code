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
                    image.Format = MagickFormat.Png;
                    image.Depth = 8;//8bit depth
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

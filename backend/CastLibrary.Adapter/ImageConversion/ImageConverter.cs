using ImageMagick;

namespace CastLibrary.Adapter.ImageConversion
{
    public interface IImageConverter
    {
        Task<Stream> ConvertToPng(Stream imageStream);
    }
    public class ImageConverter : IImageConverter
    {
        public async Task<Stream> ConvertToPng(Stream imageStream)
        {
            try
            {
                if (imageStream.CanSeek)
                {
                    imageStream.Position = 0;
                }

                var output = new MemoryStream();

                var settings = new MagickReadSettings()
                {
                    ColorSpace = ColorSpace.sRGB,
                    BackgroundColor = MagickColors.Transparent
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

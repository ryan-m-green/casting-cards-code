using System.IO.Compression;
using System.Text;

namespace CastLibrary.Logic.Services
{
    public interface ITemplateZipService
    {
        byte[] GetZip(string json, string readme);
        byte[] GetZip(string json, Dictionary<string, byte[]> images);
    }
    public class TemplateZipService : ITemplateZipService
    {
        public byte[] GetZip(string json, string readme)
        {
            using var ms = new MemoryStream();
            using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
            {
                var jsonEntry = zip.CreateEntry("library.json", CompressionLevel.Optimal);
                using (var stream = jsonEntry.Open())
                    stream.Write(Encoding.UTF8.GetBytes(json));

                var readmeEntry = zip.CreateEntry("readme.txt", CompressionLevel.Optimal);
                using (var stream = readmeEntry.Open())
                    stream.Write(Encoding.UTF8.GetBytes(readme));

                // Placeholder file so the images/ folder is visible in the ZIP
                var imgEntry = zip.CreateEntry("images/place_images_here.txt", CompressionLevel.Optimal);
                using (var stream = imgEntry.Open())
                    stream.Write(Encoding.UTF8.GetBytes("Place your image files in this folder."));
            }
            return ms.ToArray();
        }

        public byte[] GetZip(string json, Dictionary<string, byte[]> images)
        {
            using var ms = new MemoryStream();
            using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
            {
                var jsonEntry = zip.CreateEntry("library.json", CompressionLevel.Optimal);
                using (var s = jsonEntry.Open())
                    s.Write(Encoding.UTF8.GetBytes(json));

                foreach (var (filename, bytes) in images)
                {
                    var imgEntry = zip.CreateEntry($"images/{filename}", CompressionLevel.Optimal);
                    using var s = imgEntry.Open();
                    s.Write(bytes);
                }
            }
            return ms.ToArray();
        }
    }
}

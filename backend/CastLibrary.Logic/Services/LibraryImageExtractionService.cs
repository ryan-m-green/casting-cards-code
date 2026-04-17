using System.IO.Compression;

namespace CastLibrary.Logic.Services
{
    public interface ILibraryImageExtractionService
    {
        Task<Dictionary<string, Stream>> ExtractImagesAsync(ZipArchive archive);
    }
    public class LibraryImageExtractionService : ILibraryImageExtractionService
    {
        public async Task<Dictionary<string, Stream>> ExtractImagesAsync(ZipArchive archive)
        {
            var imageStreams = new Dictionary<string, Stream>(StringComparer.OrdinalIgnoreCase);
            foreach (var entry in archive.Entries)
            {
                if (!entry.FullName.StartsWith("images/", StringComparison.OrdinalIgnoreCase)) continue;
                if (string.IsNullOrEmpty(entry.Name)) continue;

                var mems = new MemoryStream();
                await using (var entryStream = entry.Open())
                    await entryStream.CopyToAsync(mems);
                mems.Position = 0;
                imageStreams[entry.Name] = mems;
            }

            return imageStreams;
        }
    }
}

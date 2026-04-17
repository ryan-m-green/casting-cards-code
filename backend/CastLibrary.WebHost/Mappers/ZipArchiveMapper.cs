using System.IO.Compression;

namespace CastLibrary.WebHost.Mappers
{
    public interface IZipArchiveMapper
    {
        Task<ZipArchive> MapAsync(IFormFile file);
    }
    public class ZipArchiveMapper : IZipArchiveMapper
    {
        public async Task<ZipArchive> MapAsync(IFormFile zipFile)
        {
            await using var zipStream = zipFile.OpenReadStream();
            using var ms = new MemoryStream();
            await zipStream.CopyToAsync(ms);
            ms.Position = 0;
            using var archive = new ZipArchive(ms, ZipArchiveMode.Read, leaveOpen: false);

            return archive;
        }
    }
}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Library
{
    public interface IImageFileNameQueryHandler
    {
        Task<string> HandleAsync(string key, string prefix, string entityName,
                                ConcurrentDictionary<string, byte> usedFilenames, ConcurrentDictionary<string, byte[]> images);
    }
    public class ImageFileNameQueryHandler(
        IImageStorageOperator imageStorage,
        IFilenameService fileNameService) : IImageFileNameQueryHandler
    {
        public async Task<string> HandleAsync(string key, string prefix, string entityName,
                ConcurrentDictionary<string, byte> usedFilenames, ConcurrentDictionary<string, byte[]> images)
        {
            var bytes = await imageStorage.ReadAsync(key);
            if (bytes is null) return null;

            var filename = fileNameService.BuildUniqueFilename(prefix, entityName, usedFilenames);
            usedFilenames[filename] = 0;
            images[filename] = bytes;
            return filename;
        }
    }
}

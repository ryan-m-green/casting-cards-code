using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using System;
using System.Collections.Generic;
using System.Text;

namespace CastLibrary.Logic.Queries.Library
{
    public interface IImageFileNameQueryHandler
    {
        Task<string> HandleAsync(string key, string prefix, string entityName,
                                HashSet<string> usedFilenames, Dictionary<string, byte[]> images);
    }
    public class ImageFileNameQueryHandler(
        IImageStorageOperator imageStorage,
        IFilenameService fileNameService) : IImageFileNameQueryHandler
    {
        public async Task<string> HandleAsync(string key, string prefix, string entityName,
    HashSet<string> usedFilenames, Dictionary<string, byte[]> images)
        {
            var bytes = await imageStorage.ReadAsync(key);
            if (bytes is null) return null;

            var filename = fileNameService.BuildUniqueFilename(prefix, entityName, usedFilenames);
            usedFilenames.Add(filename);
            images[filename] = bytes;
            return filename;
        }
    }
}

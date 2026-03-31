using Microsoft.Extensions.Configuration;
using CastLibrary.Adapter.ImageConversion;
using CastLibrary.Logic.Interfaces;

namespace CastLibrary.Adapter.Operators;

public class LocalFileImageStorageOperator(IConfiguration configuration, IImageConverter imageConverter) : IImageStorageOperator
{
    private readonly string _basePath = configuration["ImageStorage:LocalPath"]
        ?? throw new InvalidOperationException("ImageStorage:LocalPath is not configured.");
    private readonly string _baseUrl  = configuration["ImageStorage:BaseUrl"]
        ?? throw new InvalidOperationException("ImageStorage:BaseUrl is not configured.");

    public async Task SaveAsync(string key, Stream content, string contentType)
    {
        var pngImage = await imageConverter.ConvertToPng(content);

        var fullPath = Path.Combine(_basePath, key.Replace('/', Path.DirectorySeparatorChar));

        fullPath = Path.ChangeExtension(fullPath, ".png");

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var fs = File.Create(fullPath);
        await pngImage.CopyToAsync(fs);
    }

    public Task DeleteAsync(string key)
    {
        var fullPath = Path.Combine(_basePath, key.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string GetPublicUrl(string key)
    {
        if (string.IsNullOrEmpty(key)) return null;

        var fullPath = Path.Combine(_basePath, key.Replace('/', Path.DirectorySeparatorChar));
        fullPath = Path.ChangeExtension(fullPath, ".png");

        if (!File.Exists(fullPath)) return null;

        var version = File.GetLastWriteTimeUtc(fullPath).Ticks;
        return $"{_baseUrl.TrimEnd('/')}/{key}?v={version}";
    }

    public async Task<byte[]?> ReadAsync(string key)
    {
        if (string.IsNullOrEmpty(key))
            return null;

        var fullPath = Path.Combine(_basePath, key.Replace('/', Path.DirectorySeparatorChar));
        fullPath = Path.ChangeExtension(fullPath, ".png");

        if (!File.Exists(fullPath))
            return null;

        return await File.ReadAllBytesAsync(fullPath);
    }
}

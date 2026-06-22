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

        var urlKey  = key.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? key : key + ".png";
        var version = File.GetLastWriteTimeUtc(fullPath).Ticks;
        return $"{_baseUrl.TrimEnd('/')}/{urlKey}?v={version}";
    }

    public async Task<byte[]> ReadAsync(string key)
    {
        if (string.IsNullOrEmpty(key))
            return null;

        var fullPath = Path.Combine(_basePath, key.Replace('/', Path.DirectorySeparatorChar));
        fullPath = Path.ChangeExtension(fullPath, ".png");

        if (!File.Exists(fullPath))
            return null;

        return await File.ReadAllBytesAsync(fullPath);
    }

    public async Task<List<(string key, long size)>> ListAllImagesWithSizesAsync()
    {
        var imageKeys = new List<(string key, long size)>();

        try
        {
            if (!Directory.Exists(_basePath))
                return imageKeys;

            // Recursively find all .png files
            var pngFiles = Directory.GetFiles(_basePath, "*.png", SearchOption.AllDirectories);

            foreach (var file in pngFiles)
            {
                // Get relative path from base path and convert to forward slashes
                var relativePath = Path.GetRelativePath(_basePath, file);
                var key = relativePath.Replace(Path.DirectorySeparatorChar, '/');

                // Remove .png extension to match S3 key format
                if (key.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
                {
                    key = key[..^4];
                }

                var size = new FileInfo(file).Length;
                imageKeys.Add((key, size));
            }
        }
        catch
        {
            // Return empty list on error
        }

        return await Task.FromResult(imageKeys);
    }

    public async Task DeleteUserDirectoryAsync(Guid userId)
    {
        if (string.IsNullOrWhiteSpace(_basePath)) return;
        if (_basePath != "C:\\Repository\\CastingCards\\Code\\images") return;
        if (userId == Guid.Empty) return;

        var userDirectory = Path.Combine(_basePath, userId.ToString());

        try
        {
            if (Directory.Exists(userDirectory))
            {
                Directory.Delete(userDirectory, recursive: true);
            }
        }
        catch
        {
            // Log but don't throw - allow database deletion to proceed
        }

    }

    public async Task<List<string>> ListAllImagesAsync()
    {
        var imageKeys = new List<string>();

        try
        {
            if (!Directory.Exists(_basePath))
                return imageKeys;

            // Recursively find all .png files
            var pngFiles = Directory.GetFiles(_basePath, "*.png", SearchOption.AllDirectories);

            foreach (var file in pngFiles)
            {
                // Get relative path from base path and convert to forward slashes
                var relativePath = Path.GetRelativePath(_basePath, file);
                var key = relativePath.Replace(Path.DirectorySeparatorChar, '/');
                
                // Remove .png extension to match S3 key format
                if (key.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
                {
                    key = key[..^4];
                }

                imageKeys.Add(key);
            }
        }
        catch
        {
            // Return empty list on error
        }

        return await Task.FromResult(imageKeys);
    }
}

using CastLibrary.Logic.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CastLibrary.Adapter.Operators;

public class LocalAudioFileStorageOperator(IConfiguration configuration) : IAudioFileStorageOperator
{
    private readonly string _basePath = configuration["ImageStorage:LocalPath"]
        ?? throw new InvalidOperationException("ImageStorage:LocalPath is not configured.");
    private readonly string _baseUrl = configuration["ImageStorage:BaseUrl"]
        ?? throw new InvalidOperationException("ImageStorage:BaseUrl is not configured.");

    public async Task SaveAsync(string key, Stream content, string contentType)
    {
        var relativePath = $"audio/{key}";
        var fullPath = Path.Combine(_basePath, relativePath);
        var directory = Path.GetDirectoryName(fullPath);

        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        using var fileStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write);
        await content.CopyToAsync(fileStream);
    }

    public async Task DeleteAsync(string key)
    {
        if (string.IsNullOrEmpty(key))
            return;

        // Remove /audio/ prefix if present to avoid double prefix
        var cleanKey = key.StartsWith("audio/") ? key.Substring(6) : key;
        var relativePath = $"audio/{cleanKey}";
        var fullPath = Path.Combine(_basePath, relativePath);

        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        await Task.CompletedTask;
    }

    public string GetPublicUrl(string key)
    {
        if (string.IsNullOrEmpty(key))
            return null;

        var relativePath = $"audio/{key}";
        var baseUrl = _baseUrl.TrimEnd('/');
        // Remove /images/ prefix if present since we're serving audio files
        baseUrl = baseUrl.Replace("/images", "");
        return $"{baseUrl}/{relativePath}";
    }
}

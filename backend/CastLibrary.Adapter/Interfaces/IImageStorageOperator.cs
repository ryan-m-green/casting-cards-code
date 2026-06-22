namespace CastLibrary.Logic.Interfaces;

public interface IImageStorageOperator
{
    Task SaveAsync(string key, Stream content, string contentType);
    Task DeleteAsync(string key);
    string GetPublicUrl(string key);
    Task<byte[]> ReadAsync(string key);
    Task DeleteUserDirectoryAsync(Guid userId);
    Task<List<string>> ListAllImagesAsync();
    Task<List<(string key, long size)>> ListAllImagesWithSizesAsync();
}

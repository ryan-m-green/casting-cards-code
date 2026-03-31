namespace CastLibrary.Logic.Interfaces;

public interface IImageStorageOperator
{
    Task SaveAsync(string key, Stream content, string contentType);
    Task DeleteAsync(string key);
    string GetPublicUrl(string key);
    Task<byte[]?> ReadAsync(string key);
}

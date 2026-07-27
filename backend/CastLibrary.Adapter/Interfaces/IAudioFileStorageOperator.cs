namespace CastLibrary.Logic.Interfaces;

public interface IAudioFileStorageOperator
{
    Task SaveAsync(string key, Stream content, string contentType);
    Task DeleteAsync(string key);
    string GetPublicUrl(string key);
}

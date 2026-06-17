using CastLibrary.Shared.Enums;

namespace CastLibrary.Shared.Configuration;

public interface IConfigurationCache
{
    Task<T> GetAsync<T>(CastCardsConfigurationKeys key) where T : class;
    Task RefreshAsync(CastCardsConfigurationKeys key);
}

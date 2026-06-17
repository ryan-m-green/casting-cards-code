using System.Collections.Concurrent;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;
using Microsoft.Extensions.DependencyInjection;

namespace CastLibrary.Repository.Configuration;

public class ConfigurationCache : Shared.Configuration.IConfigurationCache
{
    private readonly ConcurrentDictionary<CastCardsConfigurationKeys, object> _cache = new();
    private readonly IServiceProvider _serviceProvider;

    public ConfigurationCache(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<T> GetAsync<T>(CastCardsConfigurationKeys key) where T : class
    {
        if (_cache.TryGetValue(key, out var cachedValue))
        {
            return (T)cachedValue;
        }

        using var scope = _serviceProvider.CreateScope();
        var readRepository = scope.ServiceProvider.GetRequiredService<ICastcardsConfigurationReadRepository>();
        var value = await readRepository.GetConfigurationAsync<T>(key);
        
        if (value is null)
        {
            return null;
        }

        _cache[key] = value;
        return value;
    }

    public Task RefreshAsync(CastCardsConfigurationKeys key)
    {
        _cache.TryRemove(key, out _);
        return Task.CompletedTask;
    }
}

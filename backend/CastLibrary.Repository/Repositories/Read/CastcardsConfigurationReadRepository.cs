using System.Text.Json;
using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Extensions;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICastcardsConfigurationReadRepository
{
    Task<T> GetConfigurationAsync<T>(CastCardsConfigurationKeys key) where T : class;
    Task<T> GetSubscriptionLimitsAsync<T>() where T : class;
    Task<List<CastcardsConfigurationEntity>> GetAllConfigurationsAsync();
}

public class CastcardsConfigurationReadRepository(
    ISqlConnectionFactory sqlConnectionFactory) : ICastcardsConfigurationReadRepository
{
    public async Task<T> GetConfigurationAsync<T>(CastCardsConfigurationKeys key) where T : class
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<CastcardsConfigurationEntity>(
            @"SELECT id, key, value
              FROM castcards_configuration
              WHERE key = @Key", new { Key = key.ToDbKey() });

        if (entity is null || entity.Value is null)
            return null;

        var config = JsonSerializer.Deserialize<T>(entity.Value);
        return config;
    }

    public async Task<T> GetSubscriptionLimitsAsync<T>() where T : class
    {
        return await GetConfigurationAsync<T>(CastCardsConfigurationKeys.SubscriptionLimits);
    }

    public async Task<List<CastcardsConfigurationEntity>> GetAllConfigurationsAsync()
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entities = await conn.QueryAsync<CastcardsConfigurationEntity>(
            @"SELECT id, key, value
              FROM castcards_configuration
              ORDER BY key");
        return entities.ToList();
    }
}

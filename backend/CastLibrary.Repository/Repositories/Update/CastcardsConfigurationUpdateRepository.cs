using System.Text.Json;
using CastLibrary.Repository.Configuration;
using CastLibrary.Shared.Configuration;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Extensions;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ICastcardsConfigurationUpdateRepository
{
    Task<bool> UpdateConfigurationAsync<T>(CastCardsConfigurationKeys key, T value) where T : class;
    Task<bool> UpdateConfigurationByIdAsync(Guid id, string key, string value);
}

public class CastcardsConfigurationUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    IConfigurationCache configurationCache) : ICastcardsConfigurationUpdateRepository
{
    public async Task<bool> UpdateConfigurationAsync<T>(CastCardsConfigurationKeys key, T value) where T : class
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var jsonValue = JsonSerializer.Serialize(value);
        var rows = await conn.ExecuteAsync(
            @"UPDATE castcards_configuration
              SET value = @Value::jsonb
              WHERE key = @Key",
            new { Key = key.ToString(), Value = jsonValue });
        
        if (rows > 0)
        {
            await configurationCache.RefreshAsync(key);
        }
        
        return rows > 0;
    }

    public async Task<bool> UpdateConfigurationByIdAsync(Guid id, string key, string value)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE castcards_configuration
              SET key = @Key, value = @Value::jsonb
              WHERE id = @Id",
            new { Id = id, Key = key, Value = value });
        
        if (rows > 0)
        {
            var dbKey = key;
            var configKey = Enum.GetValues<CastCardsConfigurationKeys>()
                .FirstOrDefault(k => k.ToDbKey() == dbKey);
            if (configKey != default)
            {
                await configurationCache.RefreshAsync(configKey);
            }
        }
        
        return rows > 0;
    }
}

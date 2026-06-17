using System.Text.Json;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICastcardsConfigurationInsertRepository
{
    Task CreateConfigurationAsync<T>(CastCardsConfigurationKeys key, T value) where T : class;
    Task CreateConfigurationAsync(Guid id, string key, string value);
}

public class CastcardsConfigurationInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory) : ICastcardsConfigurationInsertRepository
{
    public async Task CreateConfigurationAsync<T>(CastCardsConfigurationKeys key, T value) where T : class
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var jsonValue = JsonSerializer.Serialize(value);
        await conn.ExecuteAsync(
            @"INSERT INTO castcards_configuration (id, key, value) 
                VALUES (gen_random_uuid(), @Key, @Value::jsonb)",
            new { Key = key.ToString(), Value = jsonValue });
    }

    public async Task CreateConfigurationAsync(Guid id, string key, string value)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        await conn.ExecuteAsync(
            @"INSERT INTO castcards_configuration (id, key, value) 
                VALUES (@Id, @Key, @Value::jsonb)",
            new { Id = id, Key = key, Value = value });
    }
}

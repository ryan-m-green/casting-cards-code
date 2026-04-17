using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IPlayerCardSecretReadRepository
{
    Task<PlayerCardSecretDomain?> GetByIdAsync(Guid id);
    Task<List<PlayerCardSecretDomain>> GetByPlayerCardAsync(Guid playerCardId);
}

public class PlayerCardSecretReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerCardSecretEntityMapper mapper) : IPlayerCardSecretReadRepository
{
    private const string SelectColumns =
        @"id, player_card_id as PlayerCardId, content, is_shared as IsShared,
          shared_at as SharedAt, shared_by as SharedBy, created_at as CreatedAt";

    public async Task<PlayerCardSecretDomain?> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        var sql = $"SELECT {SelectColumns} FROM player_card_secrets WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_secrets", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<PlayerCardSecretEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_secrets", @params, entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<List<PlayerCardSecretDomain>> GetByPlayerCardAsync(Guid playerCardId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { PlayerCardId = playerCardId };
        var sql = $"SELECT {SelectColumns} FROM player_card_secrets WHERE player_card_id = @PlayerCardId ORDER BY created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_secrets", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<PlayerCardSecretEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_secrets", @params, entities.Count);

        return entities.Select(mapper.ToDomain).ToList();
    }
}

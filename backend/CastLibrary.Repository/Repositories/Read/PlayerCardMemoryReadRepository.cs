using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IPlayerCardMemoryReadRepository
{
    Task<List<PlayerCardMemoryDomain>> GetByPlayerCardAsync(Guid playerCardId);
}

public class PlayerCardMemoryReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerCardMemoryEntityMapper mapper) : IPlayerCardMemoryReadRepository
{
    public async Task<List<PlayerCardMemoryDomain>> GetByPlayerCardAsync(Guid playerCardId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { PlayerCardId = playerCardId };
        const string sql =
            @"SELECT id, player_card_id as PlayerCardId, memory_type as MemoryType,
                     session_number as SessionNumber, title, detail,
                     memory_date::text as MemoryDate, created_at as CreatedAt
              FROM player_card_memories
              WHERE player_card_id = @PlayerCardId
              ORDER BY created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_memories", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<PlayerCardMemoryEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_memories", @params, entities.Count);

        return entities.Select(mapper.ToDomain).ToList();
    }
}

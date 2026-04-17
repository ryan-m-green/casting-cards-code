using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IPlayerCardConditionReadRepository
{
    Task<List<PlayerCardConditionDomain>> GetByPlayerCardAsync(Guid playerCardId);
}

public class PlayerCardConditionReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerCardConditionEntityMapper mapper) : IPlayerCardConditionReadRepository
{
    public async Task<List<PlayerCardConditionDomain>> GetByPlayerCardAsync(Guid playerCardId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { PlayerCardId = playerCardId };
        const string sql =
            @"SELECT id, player_card_id as PlayerCardId, condition_name as ConditionName, assigned_at as AssignedAt
              FROM player_card_conditions
              WHERE player_card_id = @PlayerCardId
              ORDER BY assigned_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<PlayerCardConditionEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_conditions", @params, entities.Count);

        return entities.Select(mapper.ToDomain).ToList();
    }
}

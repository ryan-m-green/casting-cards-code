using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IPlayerCardTraitReadRepository
{
    Task<PlayerCardTraitDomain?> GetByIdAsync(Guid id);
    Task<List<PlayerCardTraitDomain>> GetByPlayerCardAsync(Guid playerCardId);
}

public class PlayerCardTraitReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerCardTraitEntityMapper mapper) : IPlayerCardTraitReadRepository
{
    public async Task<PlayerCardTraitDomain?> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql =
            @"SELECT id, player_card_id as PlayerCardId, trait_type as TraitType,
                     content, is_completed as IsCompleted, created_at as CreatedAt
              FROM player_card_traits WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_traits", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<PlayerCardTraitEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_traits", @params, entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<List<PlayerCardTraitDomain>> GetByPlayerCardAsync(Guid playerCardId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { PlayerCardId = playerCardId };
        const string sql =
            @"SELECT id, player_card_id as PlayerCardId, trait_type as TraitType,
                     content, is_completed as IsCompleted, created_at as CreatedAt
              FROM player_card_traits
              WHERE player_card_id = @PlayerCardId
              ORDER BY created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_traits", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<PlayerCardTraitEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_card_traits", @params, entities.Count);

        return entities.Select(mapper.ToDomain).ToList();
    }
}

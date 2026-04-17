using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IPlayerCastPerceptionReadRepository
{
    Task<PlayerCastPerceptionDomain?> GetByPlayerCardAndInstanceAsync(Guid playerCardId, Guid? castInstanceId, Guid? locationInstanceId, Guid? sublocationInstanceId);
    Task<List<PlayerCastPerceptionDomain>> GetByPlayerCardAsync(Guid playerCardId);
    Task<List<PlayerCastPerceptionDomain>> GetByCastInstanceAsync(Guid castInstanceId);
}

public class PlayerCastPerceptionReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerCastPerceptionEntityMapper mapper) : IPlayerCastPerceptionReadRepository
{
    private const string SelectColumns =
        @"id, player_card_id as PlayerCardId, cast_instance_id as CastInstanceId,
          location_instance_id as LocationInstanceId, sublocation_instance_id as SublocationInstanceId,
          impression, created_at as CreatedAt, updated_at as UpdatedAt";

    public async Task<PlayerCastPerceptionDomain?> GetByPlayerCardAndInstanceAsync(
        Guid playerCardId, Guid? castInstanceId, Guid? locationInstanceId, Guid? sublocationInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { PlayerCardId = playerCardId, CastInstanceId = castInstanceId, LocationInstanceId = locationInstanceId, SublocationInstanceId = sublocationInstanceId };
        var sql =
            $@"SELECT {SelectColumns} FROM player_cast_perceptions
               WHERE player_card_id = @PlayerCardId
                 AND (cast_instance_id        IS NOT DISTINCT FROM @CastInstanceId)
                 AND (location_instance_id    IS NOT DISTINCT FROM @LocationInstanceId)
                 AND (sublocation_instance_id IS NOT DISTINCT FROM @SublocationInstanceId)";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cast_perceptions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<PlayerCastPerceptionEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cast_perceptions", @params, entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<List<PlayerCastPerceptionDomain>> GetByPlayerCardAsync(Guid playerCardId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { PlayerCardId = playerCardId };
        var sql = $"SELECT {SelectColumns} FROM player_cast_perceptions WHERE player_card_id = @PlayerCardId ORDER BY created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cast_perceptions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<PlayerCastPerceptionEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cast_perceptions", @params, entities.Count);

        return entities.Select(mapper.ToDomain).ToList();
    }

    public async Task<List<PlayerCastPerceptionDomain>> GetByCastInstanceAsync(Guid castInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CastInstanceId = castInstanceId };
        var sql = $"SELECT {SelectColumns} FROM player_cast_perceptions WHERE cast_instance_id = @CastInstanceId ORDER BY created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cast_perceptions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<PlayerCastPerceptionEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cast_perceptions", @params, entities.Count);

        return entities.Select(mapper.ToDomain).ToList();
    }
}

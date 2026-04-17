using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IPlayerCastPerceptionInsertRepository
{
    Task<PlayerCastPerceptionDomain> InsertAsync(PlayerCastPerceptionDomain perception);
}

public class PlayerCastPerceptionInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCastPerceptionInsertRepository
{
    public async Task<PlayerCastPerceptionDomain> InsertAsync(PlayerCastPerceptionDomain perception)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            perception.Id,
            perception.PlayerCardId,
            perception.CastInstanceId,
            perception.LocationInstanceId,
            perception.SublocationInstanceId,
            perception.Impression,
            perception.CreatedAt,
            perception.UpdatedAt,
        };
        const string sql =
            @"INSERT INTO player_cast_perceptions
                (id, player_card_id, cast_instance_id, location_instance_id, sublocation_instance_id, impression, created_at, updated_at)
              VALUES
                (@Id, @PlayerCardId, @CastInstanceId, @LocationInstanceId, @SublocationInstanceId, @Impression, @CreatedAt, @UpdatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_cast_perceptions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_cast_perceptions", @params, rows);
        return perception;
    }
}

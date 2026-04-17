using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IPlayerCastPerceptionUpdateRepository
{
    Task UpdateImpressionAsync(Guid id, string impression, DateTime updatedAt);
}

public class PlayerCastPerceptionUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCastPerceptionUpdateRepository
{
    public async Task UpdateImpressionAsync(Guid id, string impression, DateTime updatedAt)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id, Impression = impression, UpdatedAt = updatedAt };
        const string sql =
            "UPDATE player_cast_perceptions SET impression = @Impression, updated_at = @UpdatedAt WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_cast_perceptions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_cast_perceptions", @params, rows);
    }
}

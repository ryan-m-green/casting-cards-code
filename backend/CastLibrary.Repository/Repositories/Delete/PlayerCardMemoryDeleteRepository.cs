using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IPlayerCardMemoryDeleteRepository
{
    Task DeleteAsync(Guid id);
}

public class PlayerCardMemoryDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardMemoryDeleteRepository
{
    public async Task DeleteAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql = "DELETE FROM player_card_memories WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_card_memories", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_card_memories", @params, rows);
    }
}

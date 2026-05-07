using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IQuicknoteQueueDeleteRepository
{
    Task DeleteAsync(Guid id, Guid playerUserId);
}

public class QuicknoteQueueDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IQuicknoteQueueDeleteRepository
{
    public async Task DeleteAsync(Guid id, Guid playerUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = id, PlayerUserId = playerUserId };
        const string sql =
            "DELETE FROM player_quicknote_queue WHERE id = @Id AND player_user_id = @PlayerUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_quicknote_queue", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_quicknote_queue", @params, rows);
    }
}

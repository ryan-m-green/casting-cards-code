using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IActiveSessionDeleteRepository
{
    Task DeleteAsync(Guid sessionId);
}

public class SessionDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IActiveSessionDeleteRepository
{
    public async Task DeleteAsync(Guid sessionId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = sessionId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_sessions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_sessions WHERE id = @Id", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_sessions", @params, rows);
    }
}

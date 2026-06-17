using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ISessionUpdateRepository
{
    Task<bool> UpdateAsync(SessionDomain domain);
}

public class SessionUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISessionUpdateRepository
{
    public async Task<bool> UpdateAsync(SessionDomain domain)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.IsActive
        };

        const string sql =
            @"UPDATE campaign_sessions
              SET is_active = @IsActive
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sessions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sessions", @params, rows);
        return rows > 0;
    }
}

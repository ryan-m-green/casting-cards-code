using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IBugReportUpdateRepository
{
    Task MarkFixedAsync(Guid id);
    Task UpdateSeverityAsync(Guid id, string severity);
}

public class BugReportUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IBugReportUpdateRepository
{
    public async Task MarkFixedAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id, FixedAt = DateTime.UtcNow };

        const string sql =
            @"UPDATE bug_reports
              SET is_fixed = TRUE, fixed_at = @FixedAt
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "bug_reports", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "bug_reports", @params, rows);
    }

    public async Task UpdateSeverityAsync(Guid id, string severity)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id, Severity = severity };

        const string sql =
            @"UPDATE bug_reports
              SET severity = @Severity
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "bug_reports", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "bug_reports", @params, rows);
    }
}

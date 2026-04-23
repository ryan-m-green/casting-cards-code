using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IBugReportDeleteRepository
{
    Task DeleteAsync(Guid id);
    Task CleanupFixedAsync(int daysOld);
}

public class BugReportDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IBugReportDeleteRepository
{
    public async Task DeleteAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "bug_reports", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM bug_reports WHERE id = @Id", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "bug_reports", @params, rows);
    }

    public async Task CleanupFixedAsync(int daysOld)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CutoffDate = DateTime.UtcNow.AddDays(-daysOld) };

        const string sql =
            @"DELETE FROM bug_reports
              WHERE is_fixed = TRUE AND fixed_at < @CutoffDate";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "bug_reports", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "bug_reports", @params, rows);
    }
}

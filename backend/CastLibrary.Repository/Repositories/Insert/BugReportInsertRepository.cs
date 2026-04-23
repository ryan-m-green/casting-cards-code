using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IBugReportInsertRepository
{
    Task<BugReportDomain> InsertAsync(BugReportDomain bugReport);
}

public class BugReportInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IBugReportInsertRepository
{
    public async Task<BugReportDomain> InsertAsync(BugReportDomain bugReport)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            bugReport.Id,
            bugReport.UserId,
            bugReport.Title,
            bugReport.Description,
            bugReport.StepsToReproduce,
            bugReport.Severity,
            bugReport.PageUrl,
            bugReport.Device,
            bugReport.Browser,
            bugReport.Os,
            bugReport.ScreenResolution,
            bugReport.ReportedAt,
        };

        const string sql =
            @"INSERT INTO bug_reports
                (id, user_id, title, description, steps_to_reproduce, severity,
                 page_url, device, browser, os, screen_resolution, reported_at)
              VALUES
                (@Id, @UserId, @Title, @Description, @StepsToReproduce, @Severity,
                 @PageUrl, @Device, @Browser, @Os, @ScreenResolution, @ReportedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "bug_reports", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "bug_reports", @params, rows);
        return bugReport;
    }
}

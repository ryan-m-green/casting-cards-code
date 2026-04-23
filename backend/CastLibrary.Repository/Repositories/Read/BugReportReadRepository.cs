using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IBugReportReadRepository
{
    Task<List<BugReportDomain>> GetAllAsync();
}

public class BugReportReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    IBugReportEntityMapper mapper) : IBugReportReadRepository
{
    public async Task<List<BugReportDomain>> GetAllAsync()
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entities = await conn.QueryAsync<BugReportEntity>(
            @"SELECT b.id, b.user_id AS UserId, b.title, b.description,
                     b.steps_to_reproduce AS StepsToReproduce, b.severity,
                     b.page_url AS PageUrl, b.device, b.browser, b.os,
                     b.screen_resolution AS ScreenResolution,
                     b.is_fixed AS IsFixed, b.fixed_at AS FixedAt,
                     b.reported_at AS ReportedAt,
                     u.display_name AS ReporterDisplayName
              FROM bug_reports b
              JOIN users u ON u.id = b.user_id
              ORDER BY b.reported_at DESC");

        return entities.Select(mapper.ToDomain).ToList();
    }
}

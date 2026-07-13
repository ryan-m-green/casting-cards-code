using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignSessionArchivedReadRepository
{
    Task<List<CampaignSessionArchivedDomain>> GetByCampaignIdAsync(Guid campaignId);
}

public class CampaignSessionArchivedReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignSessionArchivedReadRepository
{
    public async Task<List<CampaignSessionArchivedDomain>> GetByCampaignIdAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };

        const string sql =
            @"SELECT id, campaign_id, session_number, start_time
              FROM campaign_session_archived
              WHERE campaign_id = @CampaignId
              ORDER BY archived_at DESC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var sessions = await conn.QueryAsync<dynamic>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived", @params, sessions.Count());

        return sessions.Select(session => new CampaignSessionArchivedDomain
        {
            Id = session.id,
            CampaignId = session.campaign_id,
            SessionNumber = session.session_number,
            StartTime = session.start_time
        }).ToList();
    }
}


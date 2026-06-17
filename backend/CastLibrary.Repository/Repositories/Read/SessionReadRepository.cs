using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ISessionReadRepository
{
    Task<SessionDomain> GetActiveSessionByCampaignIdAsync(Guid campaignId);
    Task<SessionDomain> GetByIdAsync(Guid sessionId);
    Task<int?> GetLastSessionNumberAsync(Guid campaignId);
    Task<int> GetTotalSessionCountAsync(Guid campaignId);
}

public class SessionReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISessionReadRepository
{
    public async Task<SessionDomain> GetActiveSessionByCampaignIdAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };

        const string sql =
            @"SELECT id, campaign_id, session_number, start_time, start_in_game_day, is_active
              FROM campaign_sessions
              WHERE campaign_id = @CampaignId AND is_active = true";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sessions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var session = await conn.QueryFirstOrDefaultAsync<dynamic>(sql, @params);

        if (session is null)
        {
            logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sessions", @params, 0);
            return null;
        }

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sessions", @params, 1);

        return new SessionDomain
        {
            Id = session.id,
            CampaignId = session.campaign_id,
            SessionNumber = session.session_number,
            StartTime = session.start_time,
            StartInGameDay = session.start_in_game_day,
            IsActive = session.is_active
        };
    }

    public async Task<SessionDomain> GetByIdAsync(Guid sessionId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { SessionId = sessionId };

        const string sql =
            @"SELECT id, campaign_id, session_number, start_time, start_in_game_day, is_active
              FROM campaign_sessions
              WHERE id = @SessionId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sessions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var session = await conn.QueryFirstOrDefaultAsync<dynamic>(sql, @params);

        if (session is null)
        {
            logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sessions", @params, 0);
            return null;
        }

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sessions", @params, 1);

        return new SessionDomain
        {
            Id = session.id,
            CampaignId = session.campaign_id,
            SessionNumber = session.session_number,
            StartTime = session.start_time,
            StartInGameDay = session.start_in_game_day,
            IsActive = session.is_active
        };
    }

    public async Task<int?> GetLastSessionNumberAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };

        const string sql =
            @"SELECT MAX(session_number)
              FROM campaign_sessions
              WHERE campaign_id = @CampaignId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sessions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QueryFirstOrDefaultAsync<int?>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sessions", @params, result.HasValue ? 1 : 0);
        return result;
    }

    public async Task<int> GetTotalSessionCountAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };

        const string sql =
            @"SELECT COUNT(*)
              FROM campaign_sessions
              WHERE campaign_id = @CampaignId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sessions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QueryFirstOrDefaultAsync<int>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sessions", @params, result);
        return result;
    }
}

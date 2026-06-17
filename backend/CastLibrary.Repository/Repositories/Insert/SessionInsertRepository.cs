using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ISessionInsertRepository
{
    Task<SessionDomain> InsertAsync(SessionDomain domain);
}

public class SessionInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISessionInsertRepository
{
    public async Task<SessionDomain> InsertAsync(SessionDomain domain)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.SessionNumber,
            domain.StartTime,
            domain.StartInGameDay,
            domain.IsActive,
        };

        const string sql =
            @"INSERT INTO campaign_sessions
                (id, campaign_id, session_number, start_time, start_in_game_day, is_active)
              VALUES
                (@Id, @CampaignId, @SessionNumber, @StartTime, @StartInGameDay, @IsActive)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_sessions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_sessions", @params, rows);
        return domain;
    }
}

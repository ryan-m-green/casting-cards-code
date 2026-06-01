using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ISessionInsertRepository
{
    Task<SessionDomain> InsertAsync(SessionDomain domain);
    Task UpdateAsync(SessionDomain domain);
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
            domain.Title,
            domain.AlternateTitle,
            domain.StartTime,
            domain.StartInGameDay,
            domain.IsActive,
        };

        const string sql =
            @"INSERT INTO sessions
                (id, campaign_id, session_number, title, alternate_title, start_time, start_in_game_day, is_active)
              VALUES
                (@Id, @CampaignId, @SessionNumber, @Title, @AlternateTitle, @StartTime, @StartInGameDay, @IsActive)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "sessions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "sessions", @params, rows);
        return domain;
    }

    public async Task UpdateAsync(SessionDomain domain)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.IsActive
        };

        const string sql =
            @"UPDATE sessions
              SET is_active = @IsActive
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "sessions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "sessions", @params, rows);
    }
}

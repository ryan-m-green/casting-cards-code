using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICampaignSessionArchivedInsertRepository
{
    Task<CampaignSessionArchivedDomain> InsertAsync(CampaignSessionArchivedDomain domain);
}

public class CampaignSessionArchivedInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignSessionArchivedInsertRepository
{
    public async Task<CampaignSessionArchivedDomain> InsertAsync(CampaignSessionArchivedDomain domain)
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
            domain.EndTime,
            InGameDays = domain.InGameDays,
            domain.ArchivedAt,
            domain.Keywords
        };

        const string sql =
            @"INSERT INTO campaign_session_archived
                (id, campaign_id, session_number, title, alternate_title, start_time, end_time, in_game_days, archived_at, keywords)
              VALUES
                (@Id, @CampaignId, @SessionNumber, @Title, @AlternateTitle, @StartTime, @EndTime, @InGameDays::int[], @ArchivedAt, @Keywords)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_session_archived", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_session_archived", @params, rows);
        return domain;
    }
}

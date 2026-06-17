using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ISessionDeleteRepository
{
    Task<bool> DeleteAsync(Guid campaignId, Guid sessionId);
}

public class CampaignSessionArchivedDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISessionDeleteRepository
{
    public async Task<bool> DeleteAsync(Guid campaignId, Guid sessionId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, SessionId = sessionId };

        // First check if session has any chronicles
        const string checkSql =
            @"SELECT COUNT(*) 
              FROM campaign_session_chronicles 
              WHERE archived_session_id = @SessionId";

        using var conn = sqlConnectionFactory.GetConnection();
        var chronicleCount = await conn.QuerySingleAsync<int>(checkSql, @params);

        if (chronicleCount > 0)
        {
            return false; // Cannot delete session with chronicles
        }

        // Delete the session
        const string deleteSql =
            @"DELETE FROM campaign_session_archived
              WHERE id = @SessionId
                AND campaign_id = @CampaignId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_session_archived", @params);

        var rows = await conn.ExecuteAsync(deleteSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_session_archived", @params, rows);

        return rows > 0;
    }
}

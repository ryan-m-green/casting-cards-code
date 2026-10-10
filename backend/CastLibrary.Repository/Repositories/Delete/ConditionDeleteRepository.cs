using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IConditionDeleteRepository
{
    Task<int> UnlinkAsync(Guid campaignId, Guid conditionId, Guid gmUserId);

    /// <summary>Removes a condition from the owner's library entirely (its campaign links cascade away).</summary>
    Task<int> DeleteAsync(Guid conditionId, Guid gmUserId);
}

public class ConditionDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IConditionDeleteRepository
{
    public async Task<int> UnlinkAsync(Guid campaignId, Guid conditionId, Guid gmUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, ConditionId = conditionId, GmUserId = gmUserId };

        // Only the campaign's link goes — the condition itself stays in the library, so it is offered
        // again the next time someone adds conditions to a campaign.
        const string sql =
            @"DELETE FROM campaign_condition_links l
              USING conditions c
              WHERE l.condition_id = c.id
                AND l.campaign_id  = @CampaignId
                AND l.condition_id = @ConditionId
                AND c.gm_user_id   = @GmUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_condition_links", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_condition_links", @params, rows);

        return rows;
    }

    public async Task<int> DeleteAsync(Guid conditionId, Guid gmUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { ConditionId = conditionId, GmUserId = gmUserId };

        const string sql = @"DELETE FROM conditions WHERE id = @ConditionId AND gm_user_id = @GmUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "conditions", @params, rows);

        return rows;
    }
}

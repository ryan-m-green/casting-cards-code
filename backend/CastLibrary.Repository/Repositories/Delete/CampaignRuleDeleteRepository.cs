using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface ICampaignRuleDeleteRepository
{
    Task UnlinkAsync(Guid ruleId, Guid campaignId);

    /// <summary>Removes an entry from the owner's library entirely (its campaign links cascade away).</summary>
    Task<int> DeleteAsync(Guid ruleId, Guid dmUserId);
}

public class CampaignRuleDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignRuleDeleteRepository
{
    public async Task UnlinkAsync(Guid ruleId, Guid campaignId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { RuleId = ruleId, CampaignId = campaignId };
        const string sql = "DELETE FROM campaign_rule_links WHERE rule_id = @RuleId AND campaign_id = @CampaignId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_rules", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_rules", @params, rows);
    }

    public async Task<int> DeleteAsync(Guid ruleId, Guid dmUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { RuleId = ruleId, DmUserId = dmUserId };
        const string sql = @"DELETE FROM campaign_rules
                             WHERE  id         = @RuleId
                               AND  dm_user_id = @DmUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_rules", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_rules", @params, rows);

        return rows;
    }
}

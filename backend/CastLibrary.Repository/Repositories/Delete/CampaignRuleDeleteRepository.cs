using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface ICampaignRuleDeleteRepository
{
    Task UnlinkAsync(Guid ruleId, Guid campaignId);
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
}

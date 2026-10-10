using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICampaignRuleLinkInsertRepository
{
    Task<int> InsertAsync(Guid campaignId, Guid ruleId);
    Task<int> InsertManyAsync(Guid campaignId, Guid dmUserId, IReadOnlyCollection<Guid> ruleIds);
}

public class CampaignRuleLinkInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignRuleLinkInsertRepository
{
    public async Task<int> InsertAsync(Guid campaignId, Guid ruleId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, RuleId = ruleId };

        const string sql =
            @"INSERT INTO campaign_rule_links (campaign_id, rule_id, sort_order)
              VALUES (@CampaignId, @RuleId,
                      (SELECT COALESCE(MAX(sort_order), 0) + 1
                       FROM   campaign_rule_links
                       WHERE  campaign_id = @CampaignId))
              ON CONFLICT (campaign_id, rule_id) DO NOTHING";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_rule_links", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_rule_links", @params, rows);

        return rows;
    }

    public async Task<int> InsertManyAsync(Guid campaignId, Guid dmUserId, IReadOnlyCollection<Guid> ruleIds)
    {
        if (ruleIds.Count == 0) return 0;

        var spanId  = correlation.NewSpan();
        var @params = new
        {
            CampaignId = campaignId,
            DmUserId   = dmUserId,
            RuleIds    = ruleIds.ToArray(),
        };

        const string sql =
            @"INSERT INTO campaign_rule_links (campaign_id, rule_id, sort_order)
              SELECT @CampaignId,
                     r.id,
                     base.next_order + ROW_NUMBER() OVER (ORDER BY r.created_at) - 1
              FROM   campaign_rules r
              CROSS JOIN (SELECT COALESCE(MAX(sort_order), 0) AS next_order
                          FROM   campaign_rule_links
                          WHERE  campaign_id = @CampaignId) base
              WHERE  r.id = ANY(@RuleIds)
                AND  r.dm_user_id = @DmUserId
              ON CONFLICT (campaign_id, rule_id) DO NOTHING";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_rule_links", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_rule_links", @params, rows);

        return rows;
    }
}

using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IConditionLinkInsertRepository
{
    Task<int> InsertAsync(Guid campaignId, Guid conditionId);
    Task<int> InsertManyAsync(Guid campaignId, Guid gmUserId, IReadOnlyCollection<Guid> conditionIds);
}

public class ConditionLinkInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IConditionLinkInsertRepository
{
    public async Task<int> InsertAsync(Guid campaignId, Guid conditionId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, ConditionId = conditionId };

        const string sql =
            @"INSERT INTO campaign_condition_links (campaign_id, condition_id, sort_order)
              VALUES (@CampaignId, @ConditionId,
                      (SELECT COALESCE(MAX(sort_order), 0) + 1
                       FROM   campaign_condition_links
                       WHERE  campaign_id = @CampaignId))
              ON CONFLICT (campaign_id, condition_id) DO NOTHING";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_condition_links", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_condition_links", @params, rows);

        return rows;
    }

    public async Task<int> InsertManyAsync(Guid campaignId, Guid gmUserId, IReadOnlyCollection<Guid> conditionIds)
    {
        if (conditionIds.Count == 0) return 0;

        var spanId  = correlation.NewSpan();
        var @params = new
        {
            CampaignId   = campaignId,
            GmUserId     = gmUserId,
            ConditionIds = conditionIds.ToArray(),
        };

        const string sql =
            @"INSERT INTO campaign_condition_links (campaign_id, condition_id, sort_order)
              SELECT @CampaignId,
                     c.id,
                     base.next_order + ROW_NUMBER() OVER (ORDER BY c.created_at) - 1
              FROM   conditions c
              CROSS JOIN (SELECT COALESCE(MAX(sort_order), 0) AS next_order
                          FROM   campaign_condition_links
                          WHERE  campaign_id = @CampaignId) base
              WHERE  c.id = ANY(@ConditionIds)
                AND  c.gm_user_id = @GmUserId
              ON CONFLICT (campaign_id, condition_id) DO NOTHING";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_condition_links", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_condition_links", @params, rows);

        return rows;
    }
}

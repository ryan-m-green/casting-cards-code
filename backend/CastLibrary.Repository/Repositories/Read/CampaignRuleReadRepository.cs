using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignRuleReadRepository
{
    Task<List<CampaignRuleDomain>> GetByCampaignAsync(Guid campaignId);
    Task<List<CampaignRuleDomain>> GetAvailableAsync(Guid campaignId, Guid dmUserId);
    Task<CampaignRuleDomain> GetByIdAsync(Guid id, Guid dmUserId);
}

public class CampaignRuleReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignRuleEntityMapper mapper) : ICampaignRuleReadRepository
{
    private static string Columns(string sortOrder) =>
        $@"r.id,
           r.dm_user_id AS DmUserId,
           r.name,
           r.definition,
           r.children   AS Children,
           r.keywords   AS Keywords,
           {sortOrder}  AS SortOrder,
           r.created_at AS CreatedAt,
           r.updated_at AS UpdatedAt";

    public async Task<List<CampaignRuleDomain>> GetByCampaignAsync(Guid campaignId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        var sql     = $@"SELECT {Columns("l.sort_order")}
                         FROM   campaign_rule_links l
                         JOIN   campaign_rules r ON r.id = l.rule_id
                         WHERE  l.campaign_id = @CampaignId
                         ORDER BY l.sort_order, r.created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_rules", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignRuleEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_rules", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }

    public async Task<List<CampaignRuleDomain>> GetAvailableAsync(Guid campaignId, Guid dmUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, DmUserId = dmUserId };
        var sql     = $@"SELECT {Columns("0")}
                         FROM   campaign_rules r
                         WHERE  r.dm_user_id = @DmUserId
                           AND  NOT EXISTS (SELECT 1
                                            FROM   campaign_rule_links l
                                            WHERE  l.rule_id     = r.id
                                              AND  l.campaign_id = @CampaignId)
                         ORDER BY r.created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_rules", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignRuleEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_rules", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }

    public async Task<CampaignRuleDomain> GetByIdAsync(Guid id, Guid dmUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = id, DmUserId = dmUserId };
        var sql     = $@"SELECT {Columns("0")}
                         FROM   campaign_rules r
                         WHERE  r.id         = @Id
                           AND  r.dm_user_id = @DmUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_rules", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<CampaignRuleEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_rules",
            @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }
}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IConditionReadRepository
{
    Task<List<ConditionDomain>> GetByCampaignAsync(Guid campaignId);
    Task<List<ConditionDomain>> GetAvailableAsync(Guid campaignId, Guid gmUserId);
    Task<List<ConditionDomain>> GetByGmUserIdAsync(Guid gmUserId);
}

public class ConditionReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IConditionEntityMapper mapper) : IConditionReadRepository
{
    private static string Columns(string sortOrder) =>
        $@"c.id,
           c.gm_user_id  AS GmUserId,
           c.name,
           c.consequence AS Consequence,
           c.keywords    AS Keywords,
           c.color       AS Color,
           {sortOrder}   AS SortOrder,
           c.created_at  AS CreatedAt,
           c.updated_at  AS UpdatedAt";

    public async Task<List<ConditionDomain>> GetByCampaignAsync(Guid campaignId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        var sql     = $@"SELECT {Columns("l.sort_order")}
                         FROM   campaign_condition_links l
                         JOIN   conditions c ON c.id = l.condition_id
                         WHERE  l.campaign_id = @CampaignId
                         ORDER BY l.sort_order, c.created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<ConditionEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "conditions", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }

    public async Task<List<ConditionDomain>> GetAvailableAsync(Guid campaignId, Guid gmUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, GmUserId = gmUserId };
        var sql     = $@"SELECT {Columns("0")}
                         FROM   conditions c
                         WHERE  c.gm_user_id = @GmUserId
                           AND  NOT EXISTS (SELECT 1
                                            FROM   campaign_condition_links l
                                            WHERE  l.condition_id = c.id
                                              AND  l.campaign_id  = @CampaignId)
                         ORDER BY c.created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<ConditionEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "conditions", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }

    public async Task<List<ConditionDomain>> GetByGmUserIdAsync(Guid gmUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { GmUserId = gmUserId };
        var sql     = $@"SELECT {Columns("0")}
                         FROM   conditions c
                         WHERE  c.gm_user_id = @GmUserId
                         ORDER BY c.created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<ConditionEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "conditions", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }
}

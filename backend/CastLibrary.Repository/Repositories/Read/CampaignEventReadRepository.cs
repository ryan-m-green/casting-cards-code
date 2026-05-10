using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignEventReadRepository
{
    Task<List<CampaignEventDomain>> GetByCampaignIdAsync(Guid campaignId);
    Task<List<CampaignEventDomain>> GetVisibleByCampaignIdAsync(Guid campaignId);
}

public class CampaignEventReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignEventEntityMapper mapper) : ICampaignEventReadRepository
{
    public async Task<List<CampaignEventDomain>> GetByCampaignIdAsync(Guid campaignId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT id,
                     campaign_id          AS CampaignId,
                     title,
                     body,
                     sort_order           AS SortOrder,
                     linked_entity_id     AS LinkedEntityId,
                     linked_entity_type   AS LinkedEntityType,
                     file_path            AS FilePath,
                     visible_to_players   AS VisibleToPlayers,
                     created_at           AS CreatedAt,
                     updated_at           AS UpdatedAt
              FROM campaign_storyline
              WHERE campaign_id = @CampaignId
              ORDER BY sort_order ASC, created_at ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignEventEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }

    public async Task<List<CampaignEventDomain>> GetVisibleByCampaignIdAsync(Guid campaignId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT id,
                     campaign_id          AS CampaignId,
                     title,
                     body,
                     sort_order           AS SortOrder,
                     linked_entity_id     AS LinkedEntityId,
                     linked_entity_type   AS LinkedEntityType,
                     file_path            AS FilePath,
                     visible_to_players   AS VisibleToPlayers,
                     created_at           AS CreatedAt,
                     updated_at           AS UpdatedAt
              FROM campaign_storyline
              WHERE campaign_id         = @CampaignId
                AND visible_to_players  = TRUE
              ORDER BY sort_order ASC, created_at ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignEventEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }
}

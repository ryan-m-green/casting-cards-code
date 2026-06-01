using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IStorylineReadRepository
{
    Task<List<CampaignEventDomain>> GetByCampaignIdAsync(Guid campaignId);
    Task<List<CampaignEventDomain>> GetVisibleByCampaignIdAsync(Guid campaignId);
    Task<CampaignEventDomain?> GetByIdAsync(Guid eventId);
}

public class StorylineReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignEventEntityMapper mapper) : IStorylineReadRepository
{
    public async Task<List<CampaignEventDomain>> GetByCampaignIdAsync(Guid campaignId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT id,
                     campaign_id     AS CampaignId,
                     title,
                     body,
                     sort_order      AS SortOrder,
                     linked_entities AS LinkedEntities,
                     file_path       AS FilePath,
                     visible_to_players AS VisibleToPlayers,
                     scene_type      AS SceneType,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt
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
                     campaign_id     AS CampaignId,
                     title,
                     body,
                     sort_order      AS SortOrder,
                     linked_entities AS LinkedEntities,
                     file_path       AS FilePath,
                     visible_to_players AS VisibleToPlayers,
                     scene_type      AS SceneType,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt
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

    public async Task<CampaignEventDomain> GetByIdAsync(Guid eventId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { EventId = eventId };
        const string sql =
            @"SELECT id,
                     campaign_id     AS CampaignId,
                     title,
                     body,
                     sort_order      AS SortOrder,
                     linked_entities AS LinkedEntities,
                     file_path       AS FilePath,
                     visible_to_players AS VisibleToPlayers,
                     scene_type      AS SceneType,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt
              FROM campaign_storyline
              WHERE id = @EventId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<CampaignEventEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline", @params, row != null ? 1 : 0);

        return row != null ? mapper.ToDomain(row) : null;
    }
}

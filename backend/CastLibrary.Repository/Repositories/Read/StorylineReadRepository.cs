using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IStorylineReadRepository
{
    Task<List<CampaignEventDomain>> GetByCampaignIdAsync(Guid campaignId, bool? isVisibleToPlayers = null, bool? markedForArchive = null);
    Task<List<CampaignEventDomain>> GetVisibleByCampaignIdAsync(Guid campaignId);
    Task<CampaignEventDomain?> GetByIdAsync(Guid eventId);
}

public class StorylineReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignEventEntityMapper mapper) : IStorylineReadRepository
{
    public async Task<List<CampaignEventDomain>> GetByCampaignIdAsync(Guid campaignId, bool? isVisibleToPlayers = null, bool? markedForArchive = null)
    {
        var spanId = correlation.NewSpan();

        var whereClause = "WHERE campaign_id = @CampaignId";
        var parameters = new Dictionary<string, object> { ["CampaignId"] = campaignId };

        if (isVisibleToPlayers.HasValue && markedForArchive.HasValue)
        {
            whereClause += " AND (visible_to_players = @VisibleToPlayers OR marked_for_archive = @MarkedForArchive)";
            parameters["VisibleToPlayers"] = isVisibleToPlayers.Value;
            parameters["MarkedForArchive"] = markedForArchive.Value;
        }
        else if (isVisibleToPlayers.HasValue)
        {
            whereClause += " AND visible_to_players = @VisibleToPlayers";
            parameters["VisibleToPlayers"] = isVisibleToPlayers.Value;
        }
        else if (markedForArchive.HasValue)
        {
            whereClause += " AND marked_for_archive = @MarkedForArchive";
            parameters["MarkedForArchive"] = markedForArchive.Value;
        }

        var sql = $@"SELECT id,
                     campaign_id     AS CampaignId,
                     title,
                     body,
                     sort_order      AS SortOrder,
                     linked_entities AS LinkedEntities,
                     file_path       AS FilePath,
                     visible_to_players AS VisibleToPlayers,
                     marked_for_archive AS MarkedForArchive,
                     scene_type      AS SceneType,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt
              FROM campaign_storyline
              {whereClause}
              ORDER BY sort_order ASC, created_at ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline", parameters);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignEventEntity>(sql, parameters)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline", parameters, rows.Count);

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
                     marked_for_archive AS MarkedForArchive,
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
                     marked_for_archive AS MarkedForArchive,
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

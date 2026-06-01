using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignEventArchivedReadRepository
{
    Task<List<CampaignEventArchivedDomain>> GetByCampaignIdAsync(Guid campaignId);
    Task<List<CampaignEventArchivedDomain>> GetByCampaignIdAndDayAsync(Guid campaignId, int inGameDay);
}

public class CampaignEventArchivedReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignEventArchivedEntityMapper mapper) : ICampaignEventArchivedReadRepository
{
    public async Task<List<CampaignEventArchivedDomain>> GetByCampaignIdAsync(Guid campaignId)
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
                     tod_slice_name  AS TodSliceName,
                     in_game_days    AS InGameDays,
                     archived_at     AS ArchivedAt,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt
              FROM campaign_storyline_archived
              WHERE campaign_id = @CampaignId
              ORDER BY sort_order ASC, created_at ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline_archived", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignEventArchivedEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline_archived", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }

    public async Task<List<CampaignEventArchivedDomain>> GetByCampaignIdAndDayAsync(Guid campaignId, int inGameDay)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, InGameDay = inGameDay };
        const string sql =
            @"SELECT id,
                     campaign_id     AS CampaignId,
                     title,
                     body,
                     sort_order      AS SortOrder,
                     linked_entities AS LinkedEntities,
                     file_path       AS FilePath,
                     tod_slice_name  AS TodSliceName,
                     in_game_days    AS InGameDays,
                     archived_at     AS ArchivedAt,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt
              FROM campaign_storyline_archived
              WHERE campaign_id = @CampaignId
                AND @InGameDay = ANY(in_game_days)
              ORDER BY sort_order ASC, created_at ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline_archived", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignEventArchivedEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_storyline_archived", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }
}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignSessionChroniclesReadRepository
{
    Task<List<CampaignSessionChroniclesDomain>> GetByCampaignIdAsync(Guid campaignId);
}

public class CampaignSessionChroniclesReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignSessionChroniclesEntityMapper mapper) : ICampaignSessionChroniclesReadRepository
{
    public async Task<List<CampaignSessionChroniclesDomain>> GetByCampaignIdAsync(Guid campaignId)
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
                     archived_at     AS ArchivedAt,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt
              FROM campaign_session_chronicles
              WHERE campaign_id = @CampaignId
              ORDER BY sort_order ASC, created_at ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_chronicles", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignSessionChroniclesEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_chronicles", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }
}

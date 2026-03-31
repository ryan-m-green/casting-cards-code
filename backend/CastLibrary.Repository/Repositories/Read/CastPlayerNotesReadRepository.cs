using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICastPlayerNotesReadRepository
{
    Task<CampaignCastPlayerNotesDomain> GetByCastInstanceAsync(Guid campaignId, Guid castInstanceId);
    Task<List<CampaignCastPlayerNotesDomain>> GetByCastInstancesAsync(Guid campaignId, List<Guid> castInstanceIds);
}
public class CastPlayerNotesReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignCastPlayerNotesEntityMapper mapper) : ICastPlayerNotesReadRepository
{
    public async Task<CampaignCastPlayerNotesDomain> GetByCastInstanceAsync(Guid campaignId, Guid castInstanceId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, CastInstanceId = castInstanceId };
        const string sql =
            @"SELECT id,
                     campaign_id      AS CampaignId,
                     cast_instance_id AS CastInstanceId,
                     want,
                     connections,
                     alignment,
                     perception,
                     rating,
                     created_at       AS CreatedAt,
                     updated_at       AS UpdatedAt
              FROM campaign_cast_player_notes
              WHERE campaign_id      = @CampaignId
                AND cast_instance_id = @CastInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<CampaignCastPlayerNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_player_notes",
            @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }

    public async Task<List<CampaignCastPlayerNotesDomain>> GetByCastInstancesAsync(Guid campaignId, List<Guid> castInstanceIds)
    {
        if (castInstanceIds.Count == 0) return [];

        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, CastInstanceIds = castInstanceIds };
        const string sql =
            @"SELECT id,
                     campaign_id      AS CampaignId,
                     cast_instance_id AS CastInstanceId,
                     want,
                     connections,
                     alignment,
                     perception,
                     rating,
                     created_at       AS CreatedAt,
                     updated_at       AS UpdatedAt
              FROM campaign_cast_player_notes
              WHERE campaign_id      = @CampaignId
                AND cast_instance_id = ANY(@CastInstanceIds)";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignCastPlayerNotesEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_player_notes",
            @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }
}
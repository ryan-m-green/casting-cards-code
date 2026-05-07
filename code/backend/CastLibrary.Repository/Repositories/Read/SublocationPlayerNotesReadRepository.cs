using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ISublocationPlayerNotesReadRepository
{
    Task<CampaignSublocationPlayerNotesDomain> GetBySublocationInstanceAsync(Guid campaignId, Guid sublocationInstanceId);
}

public class SublocationPlayerNotesReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignSublocationPlayerNotesEntityMapper mapper) : ISublocationPlayerNotesReadRepository
{
    public async Task<CampaignSublocationPlayerNotesDomain> GetBySublocationInstanceAsync(Guid campaignId, Guid sublocationInstanceId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, SublocationInstanceId = sublocationInstanceId };
        const string sql =
            @"SELECT id,
                     campaign_id              AS CampaignId,
                     sublocation_instance_id  AS SublocationInstanceId,
                     notes,
                     created_at               AS CreatedAt,
                     updated_at               AS UpdatedAt
              FROM campaign_sublocation_player_notes
              WHERE campaign_id             = @CampaignId
                AND sublocation_instance_id = @SublocationInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<CampaignSublocationPlayerNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_player_notes",
            @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }
}

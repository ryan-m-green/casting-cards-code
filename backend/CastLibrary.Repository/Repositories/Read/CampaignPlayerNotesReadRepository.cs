using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignPlayerNotesReadRepository
{
    Task<CampaignPlayerNotesDomain> GetByCampaignAsync(Guid campaignId);
}

public class CampaignPlayerNotesReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignPlayerNotesEntityMapper mapper) : ICampaignPlayerNotesReadRepository
{
    public async Task<CampaignPlayerNotesDomain> GetByCampaignAsync(Guid campaignId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT id,
                     campaign_id AS CampaignId,
                     notes,
                     created_at  AS CreatedAt,
                     updated_at  AS UpdatedAt
              FROM campaign_player_notes
              WHERE campaign_id = @CampaignId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<CampaignPlayerNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_player_notes",
            @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }
}

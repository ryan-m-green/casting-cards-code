using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IFactionPlayerNotesReadRepository
{
    Task<CampaignFactionPlayerNotesDomain?> GetByFactionInstanceAsync(Guid campaignId, Guid factionInstanceId);
}

public class FactionPlayerNotesReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignFactionPlayerNotesEntityMapper mapper) : IFactionPlayerNotesReadRepository
{
    public async Task<CampaignFactionPlayerNotesDomain?> GetByFactionInstanceAsync(Guid campaignId, Guid factionInstanceId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, FactionInstanceId = factionInstanceId };
        const string sql =
            @"SELECT id,
                     campaign_id          AS CampaignId,
                     faction_instance_id  AS FactionInstanceId,
                     player_notes         AS Notes,
                     influence            AS Influence,
                     perception           AS Perception,
                     created_at           AS CreatedAt,
                     updated_at           AS UpdatedAt
              FROM campaign_faction_player_notes
              WHERE campaign_id         = @CampaignId
                AND faction_instance_id = @FactionInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_faction_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<CampaignFactionPlayerNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_faction_player_notes",
            @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }
}

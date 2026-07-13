using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IFactionPlayerNotesUpdateRepository
{
    Task<CampaignFactionPlayerNotesDomain> UpsertAsync(CampaignFactionPlayerNotesDomain domain);
    Task DeleteAsync(Guid campaignId, Guid factionInstanceId);
}

public class FactionPlayerNotesUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignFactionPlayerNotesEntityMapper mapper) : IFactionPlayerNotesUpdateRepository
{
    public async Task<CampaignFactionPlayerNotesDomain> UpsertAsync(CampaignFactionPlayerNotesDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.FactionInstanceId,
            Notes      = domain.Notes,
            Influence  = domain.Influence,
            Perception = domain.Perception,
            domain.CreatedAt,
            domain.UpdatedAt,
        };
        const string sql =
            @"INSERT INTO campaign_faction_player_notes
                (id, campaign_id, faction_instance_id, player_notes, influence, perception, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @FactionInstanceId, @Notes, @Influence, @Perception, @CreatedAt, @UpdatedAt)
              ON CONFLICT ON CONSTRAINT uq_camp_faction_player_notes_campaign_faction DO UPDATE SET
                player_notes = EXCLUDED.player_notes,
                influence    = EXCLUDED.influence,
                perception   = EXCLUDED.perception,
                updated_at   = EXCLUDED.updated_at
              RETURNING id, campaign_id, faction_instance_id, player_notes AS Notes, influence, perception, created_at, updated_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_faction_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<CampaignFactionPlayerNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_faction_player_notes", @params, 1);

        return mapper.ToDomain(row);
    }

    public async Task DeleteAsync(Guid campaignId, Guid factionInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, FactionInstanceId = factionInstanceId };
        const string sql = @"
            DELETE FROM campaign_faction_player_notes
            WHERE campaign_id = @CampaignId AND faction_instance_id = @FactionInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_faction_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_faction_player_notes", @params, 1);
    }
}

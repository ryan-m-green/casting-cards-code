using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ILocationPlayerNotesUpdateRepository
{
    Task<CampaignLocationPlayerNotesDomain> UpsertAsync(CampaignLocationPlayerNotesDomain domain);
    Task DeleteAsync(Guid campaignId, Guid locationInstanceId);
}

public class LocationPlayerNotesUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignLocationPlayerNotesEntityMapper mapper) : ILocationPlayerNotesUpdateRepository
{
    public async Task<CampaignLocationPlayerNotesDomain> UpsertAsync(CampaignLocationPlayerNotesDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.LocationInstanceId,
            domain.Notes,
            domain.CreatedAt,
            domain.UpdatedAt,
        };
        const string sql =
            @"INSERT INTO campaign_location_player_notes
                (id, campaign_id, location_instance_id, notes, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @LocationInstanceId, @Notes, @CreatedAt, @UpdatedAt)
              ON CONFLICT (campaign_id, location_instance_id) DO UPDATE SET
                notes      = EXCLUDED.notes,
                updated_at = EXCLUDED.updated_at
              RETURNING id, campaign_id, location_instance_id, notes, created_at, updated_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_location_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<CampaignLocationPlayerNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_location_player_notes", @params, 1);
        return mapper.ToDomain(row);
    }

    public async Task DeleteAsync(Guid campaignId, Guid locationInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, LocationInstanceId = locationInstanceId };
        const string sql = @"
            DELETE FROM campaign_location_player_notes
            WHERE campaign_id = @CampaignId AND location_instance_id = @LocationInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_location_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_location_player_notes", @params, 1);
    }
}

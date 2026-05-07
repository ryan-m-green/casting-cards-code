using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ISublocationPlayerNotesUpdateRepository
{
    Task<CampaignSublocationPlayerNotesDomain> UpsertAsync(CampaignSublocationPlayerNotesDomain domain);
}

public class SublocationPlayerNotesUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignSublocationPlayerNotesEntityMapper mapper) : ISublocationPlayerNotesUpdateRepository
{
    public async Task<CampaignSublocationPlayerNotesDomain> UpsertAsync(CampaignSublocationPlayerNotesDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.SublocationInstanceId,
            domain.Notes,
            domain.CreatedAt,
            domain.UpdatedAt,
        };
        const string sql =
            @"INSERT INTO campaign_sublocation_player_notes
                (id, campaign_id, sublocation_instance_id, notes, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @SublocationInstanceId, @Notes, @CreatedAt, @UpdatedAt)
              ON CONFLICT (campaign_id, sublocation_instance_id) DO UPDATE SET
                notes      = EXCLUDED.notes,
                updated_at = EXCLUDED.updated_at
              RETURNING id, campaign_id, sublocation_instance_id, notes, created_at, updated_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_sublocation_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<CampaignSublocationPlayerNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_sublocation_player_notes", @params, 1);
        return mapper.ToDomain(row);
    }
}

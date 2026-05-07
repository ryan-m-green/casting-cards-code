using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ICampaignPlayerNotesUpdateRepository
{
    Task<CampaignPlayerNotesDomain> UpsertAsync(CampaignPlayerNotesDomain domain);
}

public class CampaignPlayerNotesUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignPlayerNotesEntityMapper mapper) : ICampaignPlayerNotesUpdateRepository
{
    public async Task<CampaignPlayerNotesDomain> UpsertAsync(CampaignPlayerNotesDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.Notes,
            domain.CreatedAt,
            domain.UpdatedAt,
        };
        const string sql =
            @"INSERT INTO campaign_player_notes
                (id, campaign_id, notes, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @Notes, @CreatedAt, @UpdatedAt)
              ON CONFLICT (campaign_id) DO UPDATE SET
                notes      = EXCLUDED.notes,
                updated_at = EXCLUDED.updated_at
              RETURNING id, campaign_id, notes, created_at, updated_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<CampaignPlayerNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_player_notes", @params, 1);
        return mapper.ToDomain(row);
    }
}

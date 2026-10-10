using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IPlayerFieldJournalEntryUpdateRepository
{
    Task<PlayerFieldJournalEntryDomain> UpsertAsync(PlayerFieldJournalEntryDomain domain);
}

public class PlayerFieldJournalEntryUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerFieldJournalEntryEntityMapper mapper) : IPlayerFieldJournalEntryUpdateRepository
{
    public async Task<PlayerFieldJournalEntryDomain> UpsertAsync(PlayerFieldJournalEntryDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.EncounterId,
            domain.CardKey,
            domain.CastInstanceId,
            domain.SourceCastId,
            domain.Notes,
            domain.CreatedAt,
            domain.UpdatedAt,
        };
        const string sql =
            @"INSERT INTO player_field_journal_entries
                (id, campaign_id, encounter_id, card_key, cast_instance_id, source_cast_id, notes, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @EncounterId, @CardKey, @CastInstanceId, @SourceCastId, @Notes, @CreatedAt, @UpdatedAt)
              ON CONFLICT ON CONSTRAINT uq_player_field_journal_entries DO UPDATE SET
                cast_instance_id = EXCLUDED.cast_instance_id,
                source_cast_id   = EXCLUDED.source_cast_id,
                notes            = EXCLUDED.notes,
                updated_at       = EXCLUDED.updated_at
              RETURNING id               AS Id,
                        campaign_id      AS CampaignId,
                        encounter_id     AS EncounterId,
                        card_key         AS CardKey,
                        cast_instance_id AS CastInstanceId,
                        source_cast_id   AS SourceCastId,
                        notes            AS Notes,
                        created_at       AS CreatedAt,
                        updated_at       AS UpdatedAt";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "player_field_journal_entries", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<PlayerFieldJournalEntryEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "player_field_journal_entries", @params, 1);

        return mapper.ToDomain(row);
    }
}

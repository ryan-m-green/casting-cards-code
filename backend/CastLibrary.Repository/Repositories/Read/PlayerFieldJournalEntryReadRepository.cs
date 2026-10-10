using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IPlayerFieldJournalEntryReadRepository
{
    Task<List<PlayerFieldJournalEntryDomain>> GetByCampaignAsync(Guid campaignId);
}

public class PlayerFieldJournalEntryReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerFieldJournalEntryEntityMapper mapper) : IPlayerFieldJournalEntryReadRepository
{
    private const string Columns =
        @"id               AS Id,
          campaign_id      AS CampaignId,
          encounter_id     AS EncounterId,
          card_key         AS CardKey,
          cast_instance_id AS CastInstanceId,
          source_cast_id   AS SourceCastId,
          notes            AS Notes,
          created_at       AS CreatedAt,
          updated_at       AS UpdatedAt";

    public async Task<List<PlayerFieldJournalEntryDomain>> GetByCampaignAsync(Guid campaignId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        var sql =
            $@"SELECT {Columns}
               FROM player_field_journal_entries
               WHERE campaign_id = @CampaignId
               ORDER BY updated_at DESC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_field_journal_entries", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<PlayerFieldJournalEntryEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_field_journal_entries", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }
}

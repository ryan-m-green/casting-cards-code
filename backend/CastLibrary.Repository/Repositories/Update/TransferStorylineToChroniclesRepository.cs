using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ITransferStorylineToChroniclesRepository
{
    Task<int> TransferUnlockedStorylineToChroniclesAsync(Guid campaignId, Guid archivedSessionId);
}

public class TransferStorylineToChroniclesRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ITransferStorylineToChroniclesRepository
{
    public async Task<int> TransferUnlockedStorylineToChroniclesAsync(Guid campaignId, Guid archivedSessionId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, ArchivedSessionId = archivedSessionId };

        // Move unlocked storyline events to chronicles with archived_session_id reference
        const string sql =
            @"WITH events_to_move AS (
                SELECT id, campaign_id, title, body, sort_order, linked_entities, file_path, 
                       tod_slice_name, in_game_days, created_at, updated_at
                FROM campaign_storyline
                WHERE campaign_id = @CampaignId
                  AND visible_to_players = TRUE
                  AND linked_entities::jsonb != '[]'::jsonb
            )
            INSERT INTO campaign_session_chronicles
                (id, campaign_id, title, body, sort_order, linked_entities, file_path, 
                 tod_slice_name, in_game_days, archived_session_id, archived_at, created_at, updated_at)
            SELECT id, campaign_id, title, body, sort_order, linked_entities, file_path,
                   tod_slice_name, in_game_days, @ArchivedSessionId, NOW(), created_at, updated_at
            FROM events_to_move;

            DELETE FROM campaign_storyline
            WHERE campaign_id = @CampaignId
              AND visible_to_players = TRUE
              AND linked_entities::jsonb != '[]'::jsonb";

        logging.LogDbOperation(correlation.TraceId, spanId, "MOVE+DELETE", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        var rows = await conn.ExecuteAsync(sql, @params, tx);
        await tx.CommitAsync();

        logging.LogDbOperation(correlation.TraceId, spanId, "MOVE+DELETE", "campaign_storyline", @params, rows);
        return rows;
    }
}

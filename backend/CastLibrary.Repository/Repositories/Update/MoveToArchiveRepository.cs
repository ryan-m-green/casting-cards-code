using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IMoveToArchiveRepository
{
    Task<int> MoveUnlockedEventsAsync(Guid campaignId);
}

public class MoveToArchiveRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IMoveToArchiveRepository
{
    public async Task<int> MoveUnlockedEventsAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var archivedAt = DateTime.UtcNow;
        var @params = new { CampaignId = campaignId, ArchivedAt = archivedAt };

        // Move unlocked events with linked entities (not GM Notes) from active to archived table
        const string sql =
            @"WITH events_to_move AS (
                SELECT id, campaign_id, title, body, sort_order, linked_entities, file_path, 
                       tod_slice_name, in_game_day, visible_to_players, created_at, updated_at
                FROM campaign_storyline
                WHERE campaign_id = @CampaignId
                  AND visible_to_players = TRUE
                  AND linked_entities::jsonb != '[]'::jsonb
            )
            INSERT INTO campaign_storyline_archived
                (id, campaign_id, title, body, sort_order, linked_entities, file_path, 
                 tod_slice_name, in_game_day, visible_to_players, archived_at, created_at, updated_at)
            SELECT id, campaign_id, title, body, sort_order, linked_entities, file_path,
                   tod_slice_name, in_game_day, visible_to_players, @ArchivedAt, created_at, updated_at
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

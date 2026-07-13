using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IPlayerNotesDeleteRepository
{
    Task DeleteAllPlayerNotesAsync(Guid campaignId);
}

public class PlayerNotesDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerNotesDeleteRepository
{
    public async Task DeleteAllPlayerNotesAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_notes_tables", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.OpenAsync();
        await using var transaction = await conn.BeginTransactionAsync();

        try
        {
            // Delete from all 5 player notes tables
            await conn.ExecuteAsync(
                "DELETE FROM campaign_cast_player_notes WHERE campaign_id = @CampaignId",
                @params, transaction);

            await conn.ExecuteAsync(
                "DELETE FROM campaign_location_player_notes WHERE campaign_id = @CampaignId",
                @params, transaction);

            await conn.ExecuteAsync(
                "DELETE FROM campaign_sublocation_player_notes WHERE campaign_id = @CampaignId",
                @params, transaction);

            await conn.ExecuteAsync(
                "DELETE FROM campaign_faction_player_notes WHERE campaign_id = @CampaignId",
                @params, transaction);

            await conn.ExecuteAsync(
                "DELETE FROM campaign_player_notes WHERE campaign_id = @CampaignId",
                @params, transaction);

            transaction.Commit();

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_notes_tables", @params, 5);
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}

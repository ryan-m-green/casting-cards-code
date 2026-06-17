using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface ICampaignEventDeleteRepository
{
    Task DeleteAsync(Guid eventId);
    Task DeleteByCampaignAsync(Guid campaignId, bool visibleToPlayers, bool markedForArchive);
}

public class StorylineDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignEventDeleteRepository
{
    public async Task DeleteAsync(Guid eventId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = eventId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_storyline WHERE id = @Id", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_storyline", @params, rows);
    }

    public async Task DeleteByCampaignAsync(Guid campaignId, bool visibleToPlayers, bool markedForArchive)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };

        const string sql =
            @"DELETE FROM campaign_storyline
              WHERE campaign_id = @CampaignId
                AND (visible_to_players = @VisibleToPlayers OR marked_for_archive = @MarkedForArchive)";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, new { CampaignId = campaignId, VisibleToPlayers = visibleToPlayers, MarkedForArchive = markedForArchive });

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_storyline", @params, rows);
    }
}

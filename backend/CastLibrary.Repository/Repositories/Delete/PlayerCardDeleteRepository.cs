using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IPlayerCardDeleteRepository
{
    Task DeletePlayerCardAsync(Guid campaignId, Guid playerUserId);
}

public class PlayerCardDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardDeleteRepository
{
    public async Task DeletePlayerCardAsync(Guid campaignId, Guid playerUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId };
        const string sql = "DELETE FROM player_cards WHERE campaign_id = @CampaignId AND player_user_id = @PlayerUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_cards", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_cards", @params, rows);
    }
}

using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete
{
    public interface ICampaignPlayerDeleteRepository
    {
        Task RemoveCampaignPlayerAsync(Guid campaignId, Guid playerUserId);
    }
    public class CampaignPlayerDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignPlayerDeleteRepository
    {
        public async Task RemoveCampaignPlayerAsync(Guid campaignId, Guid playerUserId)
        {
            var spanId = correlation.NewSpan();
            var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId };
            const string sql =
                @"DELETE FROM campaign_players
              WHERE campaign_id = @CampaignId AND player_user_id = @PlayerUserId";

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_players", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_players", @params, 1);
        }
    }
}

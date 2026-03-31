using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete
{
    public interface ICampaignInviteCodeDeleteRepository
    {
        Task DeleteByCampaignAsync(Guid campaignId);
    }
    public class CampaignInviteCodeDeleteRepository(
    ISqlConnectionFactory connectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignInviteCodeDeleteRepository
    {
        public async Task DeleteByCampaignAsync(Guid campaignId)
        {
            var spanId = correlation.NewSpan();
            var @params = new { CampaignId = campaignId };
            const string sql = @"DELETE FROM campaign_invite_codes
                            WHERE campaign_id = @CampaignId";

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_invite_codes", @params);

            using var conn = connectionFactory.GetConnection();
            await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_invite_codes", @params, 1);
        }
    }
}

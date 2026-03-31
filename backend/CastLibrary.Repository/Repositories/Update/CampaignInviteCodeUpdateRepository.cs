using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface ICampaignInviteCodeUpdateRepository
    {
        Task UpsertAsync(CampaignInviteCodeDomain code);
    }

    public class CampaignInviteCodeUpdateRepository(
    ISqlConnectionFactory connectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignInviteCodeUpdateRepository
    {
        public async Task UpsertAsync(CampaignInviteCodeDomain code)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                CampaignId = code.CampaignId,
                Code = code.Code,
                ExpiresAt = code.ExpiresAt,
            };

            const string sql =
                @"INSERT INTO campaign_invite_codes (campaign_id, code, expires_at)
              VALUES (@CampaignId, @Code, @ExpiresAt)
              ON CONFLICT (campaign_id) DO UPDATE
              SET code = EXCLUDED.code,
              expires_at = EXCLUDED.expires_at";

            logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_invite_codes", @params);

            using var conn = connectionFactory.GetConnection();
            await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_invite_codes", @params, 1);
        }
    }
}

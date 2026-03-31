using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert
{
    public interface ISecretInsertRepository
    {
        Task<CampaignSecretDomain> InsertAsync(CampaignSecretDomain secret);
    }

    public class SecretInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISecretInsertRepository
    {
        public async Task<CampaignSecretDomain> InsertAsync(CampaignSecretDomain secret)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                secret.Id,
                secret.CampaignId,
                secret.CastInstanceId,
                secret.CityInstanceId,
                secret.LocationInstanceId,
                secret.Content,
                secret.SortOrder,
                secret.IsRevealed,
                secret.CreatedAt,
            };
            const string sql =
                @"INSERT INTO campaign_secrets
                (id, campaign_id, cast_instance_id, city_instance_id, location_instance_id, content, sort_order, is_revealed, created_at)
              VALUES
                (@Id, @CampaignId, @CastInstanceId, @CityInstanceId, @LocationInstanceId, @Content, @SortOrder, @IsRevealed, @CreatedAt)";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_secrets", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_secrets", @params, rows);
            return secret;
        }
    }
}

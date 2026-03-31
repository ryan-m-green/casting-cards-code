using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert
{
    public interface ICampaignCastRelationshipInsertRepository
    {
        Task<CampaignCastRelationshipDomain> InsertAsync(CampaignCastRelationshipDomain domain);
    }
    public class CampaignCastRelationshipInsertRepository(
    ISqlConnectionFactory connectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignCastRelationshipInsertRepository
    {
        public async Task<CampaignCastRelationshipDomain> InsertAsync(CampaignCastRelationshipDomain domain)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                domain.Id,
                domain.CampaignId,
                domain.SourceCastInstanceId,
                domain.TargetCastInstanceId,
                domain.Value,
                domain.Explanation,
                domain.CreatedAt,
                domain.UpdatedAt,
            };
            const string sql =
                @"INSERT INTO campaign_cast_relationships
                (id, campaign_id, source_cast_instance_id, target_cast_instance_id,
                 value, explanation, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @SourceCastInstanceId, @TargetCastInstanceId,
                 @Value, @Explanation, @CreatedAt, @UpdatedAt)";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_cast_relationships", @params);

            using var conn = connectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_cast_relationships", @params, rows);
            return domain;
        }
    }
}

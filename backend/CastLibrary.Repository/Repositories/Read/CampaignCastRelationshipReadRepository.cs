using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignCastRelationshipReadRepository
{
    Task<List<CampaignCastRelationshipDomain>> GetByCampaignAsync(Guid campaignId);
    Task<List<CampaignCastRelationshipDomain>> GetBySourceCastInstanceAsync(Guid campaignId, Guid sourceCastInstanceId);
    Task<CampaignCastRelationshipDomain> GetByIdAsync(Guid id);
}

public class CampaignCastRelationshipReadRepository(
    ISqlConnectionFactory connectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignCastRelationshipEntityMapper mapper) : ICampaignCastRelationshipReadRepository
{
    public async Task<List<CampaignCastRelationshipDomain>> GetByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT id,
                     campaign_id              AS CampaignId,
                     source_cast_instance_id   AS SourceCastInstanceId,
                     target_cast_instance_id   AS TargetCastInstanceId,
                     value,
                     explanation,
                     created_at               AS CreatedAt,
                     updated_at               AS UpdatedAt
              FROM campaign_cast_relationships
              WHERE campaign_id = @CampaignId
              ORDER BY source_cast_instance_id, target_cast_instance_id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_relationships", @params);

        using var conn = connectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignCastRelationshipDomain>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_relationships",
            @params, rows.Count);
        return rows;
    }

    public async Task<List<CampaignCastRelationshipDomain>> GetBySourceCastInstanceAsync(
        Guid campaignId, Guid sourceCastInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, SourceCastInstanceId = sourceCastInstanceId };
        const string sql =
            @"SELECT id,
                     campaign_id AS CampaignId,
                     source_cast_instance_id AS SourceCastInstanceId,
                     target_cast_instance_id AS TargetCastInstanceId,
                     value,
                     explanation,
                     created_at AS CreatedAt,
                     updated_at AS UpdatedAt
              FROM campaign_cast_relationships
              WHERE campaign_id = @CampaignId
                AND source_cast_instance_id = @SourceCastInstanceId
              ORDER BY target_cast_instance_id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_relationships", @params);

        using var conn = connectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignCastRelationshipEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_relationships",
            @params, rows.Count);
        return rows.Select(o => mapper.ToDomain(o)).ToList();
    }

    public async Task<CampaignCastRelationshipDomain> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql =
            @"SELECT id,
                     campaign_id AS CampaignId,
                     source_cast_instance_id   AS SourceCastInstanceId,
                     target_cast_instance_id   AS TargetCastInstanceId,
                     value,
                     explanation,
                     created_at AS CreatedAt,
                     updated_at AS UpdatedAt
              FROM campaign_cast_relationships
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_relationships", @params);

        using var conn = connectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<CampaignCastRelationshipDomain>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_relationships",
            @params, entity is null ? 0 : 1);
        return entity;
    }
}

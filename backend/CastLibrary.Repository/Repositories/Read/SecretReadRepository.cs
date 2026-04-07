using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ISecretReadRepository
{
    Task<List<CampaignSecretDomain>> GetByCampaignAsync(Guid campaignId);
    Task<CampaignSecretDomain> GetByIdAsync(Guid id);
}
public class SecretReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignSecretEntityMapper mapper) : ISecretReadRepository
{
    public async Task<List<CampaignSecretDomain>> GetByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT id, campaign_id as CampaignId, cast_instance_id as CastInstanceId, 
                     city_instance_id as CityInstanceId, sublocation_instance_id as SublocationInstanceId,
                     content as Content, sort_order as SortOrder, is_revealed as IsRevealed,
                     revealed_at as RevealedAt, created_at as CreatedAt
              FROM campaign_secrets 
              WHERE campaign_id = @CampaignId 
              ORDER BY sort_order";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_secrets", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<CampaignSecretEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_secrets",
            @params, entities.Count);

        return entities.Select(o => mapper.ToDomain(o)).ToList();
    }

    public async Task<CampaignSecretDomain> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_secrets", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<CampaignSecretEntity>(
            @"SELECT id, campaign_id as CampaignId, cast_instance_id as CastInstanceId,
                     city_instance_id as CityInstanceId, sublocation_instance_id as SublocationInstanceId,
                     content as Content, sort_order as SortOrder, is_revealed as IsRevealed,
                     revealed_at as RevealedAt, created_at as CreatedAt
              FROM campaign_secrets 
              WHERE id = @Id", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_secrets",
            @params, entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }
}

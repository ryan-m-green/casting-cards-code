using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ILocationReadRepository
{
    Task<List<LocationDomain>> GetAllByDmAsync(Guid dmUserId);
    Task<LocationDomain> GetByIdAsync(Guid id);
}
public class LocationReadRepository(
    ISqlConnectionFactory sqlConnectinFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ILocationEntityMapper mapper) : ILocationReadRepository
{
    public async Task<List<LocationDomain>> GetAllByDmAsync(Guid dmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql =
            @"SELECT id, dm_user_id AS DmUserId, name, classification, size, condition, geography,
                     architecture, climate, religion, vibe, languages, description,
                     campaign_id AS CampaignId, created_at AS CreatedAt
              FROM locations WHERE dm_user_id = @DmUserId AND campaign_id IS NULL ORDER BY name";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "locations", @params);

        using var conn = sqlConnectinFactory.GetConnection();
        var entities = (await conn.QueryAsync<LocationEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "locations", @params, entities.Count);
        return entities.Select(o => mapper.ToDomain(o)).ToList();
    }

    public async Task<LocationDomain> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql =
            @"SELECT id, dm_user_id AS DmUserId, name, classification, size, condition, geography,
                     architecture, climate, religion, vibe, languages, description,
                     campaign_id AS CampaignId, created_at AS CreatedAt
              FROM locations WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "locations", @params);

        using var conn = sqlConnectinFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<LocationEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "locations", @params,
            entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }
}


using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICityReadRepository
{
    Task<List<CityDomain>> GetAllByDmAsync(Guid dmUserId);
    Task<CityDomain> GetByIdAsync(Guid id);
}
public class CityReadRepository(
    ISqlConnectionFactory sqlConnectinFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICityEntityMapper mapper) : ICityReadRepository
{
    public async Task<List<CityDomain>> GetAllByDmAsync(Guid dmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql =
            @"SELECT id, dm_user_id AS DmUserId, name, classification, size, condition, geography,
                     architecture, climate, religion, vibe, languages, description,
                     created_at AS CreatedAt
              FROM cities WHERE dm_user_id = @DmUserId ORDER BY name";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "cities", @params);

        using var conn = sqlConnectinFactory.GetConnection();
        var entities = (await conn.QueryAsync<CityEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "cities", @params, entities.Count);
        return entities.Select(o => mapper.ToDomain(o)).ToList();
    }

    public async Task<CityDomain> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql =
            @"SELECT id, dm_user_id AS DmUserId, name, classification, size, condition, geography,
                     architecture, climate, religion, vibe, languages, description,
                     created_at AS CreatedAt
              FROM cities WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "cities", @params);

        using var conn = sqlConnectinFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<CityEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "cities", @params,
            entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }
}

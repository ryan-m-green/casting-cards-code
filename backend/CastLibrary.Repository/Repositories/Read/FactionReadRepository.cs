using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IFactionReadRepository
{
    Task<List<FactionDomain>> GetAllByDmAsync(Guid dmUserId);
    Task<FactionDomain> GetByIdAsync(Guid factionId);
    Task<int> GetFactionCountByDmAsync(Guid dmUserId);
}

public class FactionReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IFactionEntityMapper mapper) : IFactionReadRepository
{
    public async Task<List<FactionDomain>> GetAllByDmAsync(Guid dmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql =
            @"SELECT faction_id AS FactionId, dm_user_id AS DmUserId, name, type,
                     influence, perception, hidden, description, dm_notes AS DmNotes,
                     symbol_path AS SymbolPath, created_at AS CreatedAt
                FROM factions
               WHERE dm_user_id = @DmUserId
               ORDER BY name";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<FactionEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params, entities.Count);
        return entities.Select(mapper.ToDomain).ToList();
    }

    public async Task<FactionDomain> GetByIdAsync(Guid factionId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionId = factionId };
        const string sql =
            @"SELECT faction_id AS FactionId, dm_user_id AS DmUserId, name, type,
                     influence, perception, hidden, description, dm_notes AS DmNotes,
                     symbol_path AS SymbolPath, created_at AS CreatedAt
                FROM factions
               WHERE faction_id = @FactionId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<FactionEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params, entity is null ? 0 : 1);
        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<int> GetFactionCountByDmAsync(Guid dmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql = "SELECT COUNT(*) FROM factions WHERE dm_user_id = @DmUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var count = await conn.QuerySingleAsync<int>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params, count);
        return count;
    }
}

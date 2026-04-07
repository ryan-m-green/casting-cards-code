using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICastReadRepository
{
    Task<List<CastDomain>> GetAllByDmAsync(Guid dmUserId);
    Task<CastDomain> GetByIdAsync(Guid id);
}

public class CastReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICastEntityMapper mapper) : ICastReadRepository
{

    public async Task<List<CastDomain>> GetAllByDmAsync(Guid dmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql =
            @"SELECT id, dm_user_id AS DmUserId, name, pronouns, race, role, age, alignment, posture, speed,
                     voice_placement AS VoicePlacement, voice_notes AS VoiceNotes,
                     description, public_description AS PublicDescription,
                     created_at AS CreatedAt
                FROM casts
                WHERE dm_user_id = @DmUserId ORDER BY name";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<CastEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params, entities.Count);
        return entities.Select(o => mapper.ToDomain(o)).ToList();
    }

    public async Task<CastDomain> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql =
            @"SELECT id, dm_user_id AS DmUserId, name, pronouns, race, role, age, alignment, posture, speed,
                     voice_placement AS VoicePlacement, voice_notes AS VoiceNotes,
                     description, public_description AS PublicDescription,
                     created_at AS CreatedAt
                FROM casts
                WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<CastEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params,
            entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }
}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IEncounterCombatantConditionReadRepository
{
    Task<List<EncounterCombatantConditionDomain>> GetByCombatantAsync(Guid combatantId);
}

public class EncounterCombatantConditionReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IEncounterCombatantConditionEntityMapper mapper) : IEncounterCombatantConditionReadRepository
{
    public async Task<List<EncounterCombatantConditionDomain>> GetByCombatantAsync(Guid combatantId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CombatantId = combatantId };
        const string sql =
            @"SELECT id, encounter_combatant_id as CombatantId, condition_name as ConditionName, assigned_at as AssignedAt
              FROM encounter_combatant_conditions
              WHERE encounter_combatant_id = @CombatantId
              ORDER BY assigned_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "encounter_combatant_conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<EncounterCombatantConditionEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "encounter_combatant_conditions", @params, entities.Count);

        return entities.Select(mapper.ToDomain).ToList();
    }
}

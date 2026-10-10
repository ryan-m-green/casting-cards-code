using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IEncounterCombatantConditionInsertRepository
{
    Task<EncounterCombatantConditionDomain> InsertAsync(EncounterCombatantConditionDomain condition);
}

public class EncounterCombatantConditionInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IEncounterCombatantConditionInsertRepository
{
    public async Task<EncounterCombatantConditionDomain> InsertAsync(EncounterCombatantConditionDomain condition)
    {
        var spanId = correlation.NewSpan();
        var @params = new { condition.Id, condition.CombatantId, condition.ConditionName, condition.AssignedAt };
        const string sql =
            @"INSERT INTO encounter_combatant_conditions (id, encounter_combatant_id, condition_name, assigned_at)
              VALUES (@Id, @CombatantId, @ConditionName, @AssignedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "encounter_combatant_conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "encounter_combatant_conditions", @params, rows);
        return condition;
    }
}

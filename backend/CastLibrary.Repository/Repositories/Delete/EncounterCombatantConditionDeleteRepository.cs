using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IEncounterCombatantConditionDeleteRepository
{
    Task DeleteAsync(Guid id);

    /// <summary>
    /// Clears everything a card carries — what a card that has gone down sheds, since
    /// conditions are for a card still in the fight.
    /// </summary>
    Task DeleteByCombatantAsync(Guid combatantId);
}

public class EncounterCombatantConditionDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IEncounterCombatantConditionDeleteRepository
{
    public async Task DeleteAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql = "DELETE FROM encounter_combatant_conditions WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_combatant_conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_combatant_conditions", @params, rows);
    }

    public async Task DeleteByCombatantAsync(Guid combatantId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CombatantId = combatantId };
        const string sql = "DELETE FROM encounter_combatant_conditions WHERE encounter_combatant_id = @CombatantId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_combatant_conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_combatant_conditions", @params, rows);
    }
}

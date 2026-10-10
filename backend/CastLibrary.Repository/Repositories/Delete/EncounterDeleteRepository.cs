using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IEncounterDeleteRepository
{
    Task DeleteEncounterAsync(Guid encounterId);
    Task DeleteSpotAsync(Guid spotId);
    Task DeleteCombatantAsync(Guid combatantId);
}

public class EncounterDeleteRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : IEncounterDeleteRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task DeleteEncounterAsync(Guid encounterId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { EncounterId = encounterId };
        const string sql = "DELETE FROM campaign_encounters WHERE id = @EncounterId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_encounters", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_encounters", @params, rows);
    }

    public async Task DeleteSpotAsync(Guid spotId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { SpotId = spotId };
        const string sql = "DELETE FROM encounter_spots WHERE id = @SpotId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_spots", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_spots", @params, rows);
    }

    public async Task DeleteCombatantAsync(Guid combatantId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CombatantId = combatantId };
        const string sql = "DELETE FROM encounter_combatants WHERE id = @CombatantId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_combatants", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_combatants", @params, rows);
    }
}

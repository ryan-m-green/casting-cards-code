using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IFactionDeleteRepository
{
    Task DeleteAsync(Guid factionId);
}

public class FactionDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IFactionDeleteRepository
{
    public async Task DeleteAsync(Guid factionId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionId = factionId };
        const string sql = "DELETE FROM factions WHERE faction_id = @FactionId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "factions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "factions", @params, rows);
    }
}

using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IAmbianceDeleteRepository
{
    Task DeleteAsync(Guid ambianceId);
}

public class AmbianceDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IAmbianceDeleteRepository
{
    public async Task DeleteAsync(Guid ambianceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { AmbianceId = ambianceId };

        const string sql = @"DELETE FROM ambiances WHERE id = @AmbianceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "ambiances", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rowsAffected = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "ambiances", @params, rowsAffected);
    }
}

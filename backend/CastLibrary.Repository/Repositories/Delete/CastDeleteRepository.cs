using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete
{
    public interface ICastDeleteRepository
    {
        Task DeleteAsync(Guid id);
    }
    public class CastDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICastDeleteRepository
    {
        public async Task DeleteAsync(Guid id)
        {
            var spanId = correlation.NewSpan();
            var @params = new { Id = id };

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "casts", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync("DELETE FROM casts WHERE id = @Id", @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "casts", @params, rows);
        }
    }
}

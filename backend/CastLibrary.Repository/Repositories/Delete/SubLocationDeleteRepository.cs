using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete
{
    public interface ISublocationDeleteRepository
    {
        Task DeleteAsync(Guid id);
    }
    public class SublocationDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISublocationDeleteRepository
    {
        public async Task DeleteAsync(Guid id)
        {
            var spanId = correlation.NewSpan();
            var @params = new { Id = id };

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "sublocations", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync("DELETE FROM sublocations WHERE id = @Id", @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "sublocations", @params, rows);
        }
    }
}

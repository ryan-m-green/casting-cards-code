using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete
{
    public interface ILocationDeleteRepository
    {
        Task DeleteAsync(Guid id);
    }
    public class LocationDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ILocationDeleteRepository
    {
        public async Task DeleteAsync(Guid id)
        {
            var spanId = correlation.NewSpan();
            var @params = new { Id = id };

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "locations", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync("DELETE FROM locations WHERE id = @Id", @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "locations", @params, rows);
        }
    }
}

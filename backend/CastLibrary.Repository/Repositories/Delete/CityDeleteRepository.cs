using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete
{
    public interface ICityDeleteRepository
    {
        Task DeleteAsync(Guid id);
    }
    public class CityDeleteRepository(
    ISqlConnectionFactory sqlConnectinFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICityDeleteRepository
    {
        public async Task DeleteAsync(Guid id)
        {
            var spanId = correlation.NewSpan();
            var @params = new { Id = id };

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "cities", @params);

            using var conn = sqlConnectinFactory.GetConnection();
            var rows = await conn.ExecuteAsync("DELETE FROM cities WHERE id = @Id", @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "cities", @params, rows);
        }
    }
}

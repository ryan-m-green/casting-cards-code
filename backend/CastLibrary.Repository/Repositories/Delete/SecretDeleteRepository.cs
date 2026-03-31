using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete
{
    public interface ISecretDeleteRepository
    {
        Task DeleteAsync(Guid id);
    }
    public class SecretDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISecretDeleteRepository
    {
        public async Task DeleteAsync(Guid id)
        {
            var spanId = correlation.NewSpan();
            var @params = new { Id = id };

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_secrets", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(
                "DELETE FROM campaign_secrets WHERE id=@Id", @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_secrets", @params, rows);
        }
    }
}

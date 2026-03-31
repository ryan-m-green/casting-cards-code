using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete
{
    public interface ICampaignCastRelationshipDeleteRepository
    {
        Task DeleteAsync(Guid id);
    }
    public class CampaignCastRelationshipDeleteRepository(
    ISqlConnectionFactory connectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignCastRelationshipDeleteRepository
    {
        public async Task DeleteAsync(Guid id)
        {
            var spanId = correlation.NewSpan();
            var @params = new { Id = id };

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_cast_relationships", @params);

            using var conn = connectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(
                "DELETE FROM campaign_cast_relationships WHERE id = @Id", @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_cast_relationships", @params, rows);
        }
    }
}

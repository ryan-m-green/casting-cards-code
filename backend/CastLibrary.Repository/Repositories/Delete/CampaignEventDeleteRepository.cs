using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface ICampaignEventDeleteRepository
{
    Task DeleteAsync(Guid eventId);
}

public class CampaignEventDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignEventDeleteRepository
{
    public async Task DeleteAsync(Guid eventId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = eventId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_storyline WHERE id = @Id", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_storyline", @params, rows);
    }
}

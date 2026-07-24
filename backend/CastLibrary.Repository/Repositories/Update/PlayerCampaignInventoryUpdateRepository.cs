using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IPlayerCampaignInventoryUpdateRepository
{
    Task IncrementCountAsync(Guid id);
    Task DecrementCountAsync(Guid id);
    Task DeleteAsync(Guid id);
}

public class PlayerCampaignInventoryUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCampaignInventoryUpdateRepository
{
    public async Task IncrementCountAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql = @"UPDATE player_campaign_inventory SET count = count + 1 WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_campaign_inventory", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_campaign_inventory", @params, rows);
    }

    public async Task DecrementCountAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql = @"UPDATE player_campaign_inventory SET count = count - 1 WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_campaign_inventory", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_campaign_inventory", @params, rows);
    }

    public async Task DeleteAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql = @"DELETE FROM player_campaign_inventory WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_campaign_inventory", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_campaign_inventory", @params, rows);
    }
}

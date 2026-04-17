using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICurrencyBalanceReadRepository
{
    Task<Dictionary<string, int>> GetByPlayerAsync(Guid campaignId, Guid playerUserId);
    Task<Dictionary<Guid, Dictionary<string, int>>> GetByCampaignAsync(Guid campaignId);
}

public class CurrencyBalanceReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICurrencyBalanceReadRepository
{
    private record CurrencyRow(Guid PlayerUserId, string CurrencyType, long Total);

    public async Task<Dictionary<string, int>> GetByPlayerAsync(Guid campaignId, Guid playerUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId };
        const string sql =
            @"SELECT player_user_id AS PlayerUserId, currency_type AS CurrencyType, SUM(amount) AS Total
              FROM currency_transactions
              WHERE campaign_id = @CampaignId AND player_user_id = @PlayerUserId
              GROUP BY player_user_id, currency_type";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "currency_transactions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CurrencyRow>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "currency_transactions", @params, rows.Count);

        return rows.ToDictionary(r => r.CurrencyType, r => (int)r.Total);
    }

    public async Task<Dictionary<Guid, Dictionary<string, int>>> GetByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT player_user_id AS PlayerUserId, currency_type AS CurrencyType, SUM(amount) AS Total
              FROM currency_transactions
              WHERE campaign_id = @CampaignId
              GROUP BY player_user_id, currency_type";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "currency_transactions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CurrencyRow>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "currency_transactions", @params, rows.Count);

        return rows
            .GroupBy(r => r.PlayerUserId)
            .ToDictionary(
                g => g.Key,
                g => g.ToDictionary(r => r.CurrencyType, r => (int)r.Total));
    }
}

using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ICurrencyTransactionUpdateRepository
{
    /// <summary>
    /// Updates the amount on the single row for the given player/campaign/currencyType.
    /// Targets only the first matching row in case of duplicates.
    /// </summary>
    Task SetAmountAsync(Guid campaignId, Guid playerUserId, string currencyType, int newAmount);
}

public class CurrencyTransactionUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICurrencyTransactionUpdateRepository
{
    public async Task SetAmountAsync(Guid campaignId, Guid playerUserId, string currencyType, int newAmount)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId, CurrencyType = currencyType, NewAmount = newAmount };

        const string sql =
            @"UPDATE currency_transactions
              SET amount = @NewAmount
              WHERE id = (
                  SELECT id FROM currency_transactions
                  WHERE campaign_id = @CampaignId
                    AND player_user_id = @PlayerUserId
                    AND currency_type  = @CurrencyType
                  LIMIT 1
              )";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "currency_transactions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "currency_transactions", @params, rows);
    }
}

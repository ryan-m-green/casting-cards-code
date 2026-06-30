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
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId, CurrencyType = currencyType, NewAmount = newAmount };

        const string updateSql =
            @"UPDATE currency_transactions
              SET amount = @NewAmount
              WHERE campaign_id = @CampaignId
                AND player_user_id = @PlayerUserId
                AND currency_type = @CurrencyType";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "currency_transactions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(updateSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "currency_transactions", @params, rows);

        if (rows == 0)
        {
            var id = Guid.NewGuid();
            var insertParams = new { Id = id, CampaignId = campaignId, PlayerUserId = playerUserId, CurrencyType = currencyType, NewAmount = newAmount };

            const string insertSql =
                @"INSERT INTO currency_transactions (id, campaign_id, player_user_id, amount, currency_type, transaction_type, description, created_by, created_at)
                  VALUES (@Id, @CampaignId, @PlayerUserId, @NewAmount, @CurrencyType, 'ADJUSTMENT', '', NULL, NOW())";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "currency_transactions", insertParams);

            var insertRows = await conn.ExecuteAsync(insertSql, insertParams);

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "currency_transactions", insertParams, insertRows);
        }
    }
}

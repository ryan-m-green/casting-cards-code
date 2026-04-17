using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IGoldTransactionInsertRepository
{
    Task InsertAsync(GoldTransactionDomain transaction);
}

public class GoldTransactionInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IGoldTransactionInsertRepository
{
    public async Task InsertAsync(GoldTransactionDomain transaction)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            transaction.Id,
            transaction.CampaignId,
            transaction.PlayerUserId,
            transaction.Amount,
            transaction.Currency,
            TransactionType = transaction.TransactionType.ToString(),
            transaction.Description,
            transaction.CreatedBy,
            transaction.CreatedAt,
        };
        const string sql =
            @"INSERT INTO currency_transactions
                  (id, campaign_id, player_user_id, amount, currency_type, transaction_type, description, created_by, created_at)
              VALUES
                  (@Id, @CampaignId, @PlayerUserId, @Amount, @Currency, @TransactionType, @Description, @CreatedBy, @CreatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "currency_transactions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "currency_transactions", @params, rows);
    }
}

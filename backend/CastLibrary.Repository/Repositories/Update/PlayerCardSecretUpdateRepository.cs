using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IPlayerCardSecretUpdateRepository
{
    Task ShareAsync(Guid id, string sharedBy, DateTime sharedAt);
}

public class PlayerCardSecretUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardSecretUpdateRepository
{
    public async Task ShareAsync(Guid id, string sharedBy, DateTime sharedAt)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id, SharedBy = sharedBy, SharedAt = sharedAt };
        const string sql =
            "UPDATE player_card_secrets SET is_shared = TRUE, shared_by = @SharedBy, shared_at = @SharedAt WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_card_secrets", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_card_secrets", @params, rows);
    }
}

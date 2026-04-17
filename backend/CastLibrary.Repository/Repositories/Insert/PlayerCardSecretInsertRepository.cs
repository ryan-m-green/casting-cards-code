using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IPlayerCardSecretInsertRepository
{
    Task<PlayerCardSecretDomain> InsertAsync(PlayerCardSecretDomain secret);
}

public class PlayerCardSecretInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardSecretInsertRepository
{
    public async Task<PlayerCardSecretDomain> InsertAsync(PlayerCardSecretDomain secret)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            secret.Id,
            secret.PlayerCardId,
            secret.Content,
            secret.IsShared,
            secret.SharedAt,
            secret.SharedBy,
            secret.CreatedAt,
        };
        const string sql =
            @"INSERT INTO player_card_secrets (id, player_card_id, content, is_shared, shared_at, shared_by, created_at)
              VALUES (@Id, @PlayerCardId, @Content, @IsShared, @SharedAt, @SharedBy, @CreatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_card_secrets", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_card_secrets", @params, rows);
        return secret;
    }
}

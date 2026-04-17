using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IPlayerCardTraitUpdateRepository
{
    Task UpdateContentAsync(Guid id, string content);
    Task UpdateCompletedAsync(Guid id, bool isCompleted);
}

public class PlayerCardTraitUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardTraitUpdateRepository
{
    public async Task UpdateContentAsync(Guid id, string content)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id, Content = content };
        const string sql = "UPDATE player_card_traits SET content = @Content WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_card_traits", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_card_traits", @params, rows);
    }

    public async Task UpdateCompletedAsync(Guid id, bool isCompleted)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id, IsCompleted = isCompleted };
        const string sql = "UPDATE player_card_traits SET is_completed = @IsCompleted WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_card_traits", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_card_traits", @params, rows);
    }
}

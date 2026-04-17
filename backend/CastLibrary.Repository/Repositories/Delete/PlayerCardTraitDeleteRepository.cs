using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IPlayerCardTraitDeleteRepository
{
    Task DeleteAsync(Guid id);
}

public class PlayerCardTraitDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardTraitDeleteRepository
{
    public async Task DeleteAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql = "DELETE FROM player_card_traits WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_card_traits", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_card_traits", @params, rows);
    }
}

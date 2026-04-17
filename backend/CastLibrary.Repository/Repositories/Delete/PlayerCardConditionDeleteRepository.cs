using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IPlayerCardConditionDeleteRepository
{
    Task DeleteAsync(Guid id);
}

public class PlayerCardConditionDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardConditionDeleteRepository
{
    public async Task DeleteAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql = "DELETE FROM player_card_conditions WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_card_conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_card_conditions", @params, rows);
    }
}

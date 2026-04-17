using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IPlayerCardUpdateRepository
{
    Task UpdateAsync(Guid id, string name, string? description, DateTime updatedAt);
}

public class PlayerCardUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardUpdateRepository
{
    public async Task UpdateAsync(Guid id, string name, string? description, DateTime updatedAt)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id, Name = name, Description = description, UpdatedAt = updatedAt };
        const string sql =
            @"UPDATE player_cards SET name = @Name, description = @Description, updated_at = @UpdatedAt WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_cards", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_cards", @params, rows);
    }

}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IPlayerCardMemoryInsertRepository
{
    Task<PlayerCardMemoryDomain> InsertAsync(PlayerCardMemoryDomain memory);
}

public class PlayerCardMemoryInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardMemoryInsertRepository
{
    public async Task<PlayerCardMemoryDomain> InsertAsync(PlayerCardMemoryDomain memory)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            memory.Id,
            memory.PlayerCardId,
            MemoryType = memory.MemoryType.ToString(),
            memory.SessionNumber,
            memory.Title,
            memory.Detail,
            memory.CreatedAt,
        };
        const string sql =
            @"INSERT INTO player_card_memories (id, player_card_id, memory_type, session_number, title, detail, created_at)
              VALUES (@Id, @PlayerCardId, @MemoryType, @SessionNumber, @Title, @Detail, @CreatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_card_memories", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_card_memories", @params, rows);
        return memory;
    }
}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IQuicknoteQueueUpdateRepository
{
    Task<PlayerQuicknoteQueueDomain> UpdateAsync(PlayerQuicknoteQueueDomain domain);
}

public class QuicknoteQueueUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerQuicknoteQueueEntityMapper mapper) : IQuicknoteQueueUpdateRepository
{
    public async Task<PlayerQuicknoteQueueDomain> UpdateAsync(PlayerQuicknoteQueueDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.PlayerUserId,
            domain.Content,
            domain.UpdatedAt,
        };
        const string sql =
            @"UPDATE player_quicknote_queue
              SET    content    = @Content,
                     updated_at = @UpdatedAt
              WHERE  id             = @Id
                AND  player_user_id = @PlayerUserId
              RETURNING id, campaign_id, player_user_id, content, created_at, updated_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_quicknote_queue", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<PlayerQuicknoteQueueEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_quicknote_queue", @params, 1);

        return mapper.ToDomain(row);
    }
}

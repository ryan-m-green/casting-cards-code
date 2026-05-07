using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IQuicknoteQueueInsertRepository
{
    Task<PlayerQuicknoteQueueDomain> InsertAsync(PlayerQuicknoteQueueDomain domain);
}

public class QuicknoteQueueInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerQuicknoteQueueEntityMapper mapper) : IQuicknoteQueueInsertRepository
{
    public async Task<PlayerQuicknoteQueueDomain> InsertAsync(PlayerQuicknoteQueueDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.PlayerUserId,
            domain.Content,
            domain.CreatedAt,
            domain.UpdatedAt,
        };
        const string sql =
            @"INSERT INTO player_quicknote_queue
                (id, campaign_id, player_user_id, content, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @PlayerUserId, @Content, @CreatedAt, @UpdatedAt)
              RETURNING id, campaign_id, player_user_id, content, created_at, updated_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_quicknote_queue", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<PlayerQuicknoteQueueEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_quicknote_queue", @params, 1);

        return mapper.ToDomain(row);
    }
}

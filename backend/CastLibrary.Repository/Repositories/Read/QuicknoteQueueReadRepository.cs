using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IQuicknoteQueueReadRepository
{
    Task<List<PlayerQuicknoteQueueDomain>> GetByCampaignPlayerAsync(Guid campaignId, Guid playerUserId);
    Task<PlayerQuicknoteQueueDomain> GetByIdAsync(Guid id, Guid playerUserId);
}

public class QuicknoteQueueReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerQuicknoteQueueEntityMapper mapper) : IQuicknoteQueueReadRepository
{
    public async Task<List<PlayerQuicknoteQueueDomain>> GetByCampaignPlayerAsync(Guid campaignId, Guid playerUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId };
        const string sql =
            @"SELECT id,
                     campaign_id     AS CampaignId,
                     player_user_id  AS PlayerUserId,
                     content,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt
              FROM player_quicknote_queue
              WHERE campaign_id    = @CampaignId
                AND player_user_id = @PlayerUserId
              ORDER BY created_at DESC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_quicknote_queue", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<PlayerQuicknoteQueueEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_quicknote_queue", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }

    public async Task<PlayerQuicknoteQueueDomain> GetByIdAsync(Guid id, Guid playerUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = id, PlayerUserId = playerUserId };
        const string sql =
            @"SELECT id,
                     campaign_id     AS CampaignId,
                     player_user_id  AS PlayerUserId,
                     content,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt
              FROM player_quicknote_queue
              WHERE id             = @Id
                AND player_user_id = @PlayerUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_quicknote_queue", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<PlayerQuicknoteQueueEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_quicknote_queue",
            @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }
}

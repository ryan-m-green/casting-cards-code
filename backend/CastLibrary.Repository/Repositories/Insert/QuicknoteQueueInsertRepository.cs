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
            LinkedEntities = CampaignEventEntityMapper.ToJson(domain.LinkedEntities),
            domain.VisibleToPlayers,
            domain.CreatedAt,
            domain.UpdatedAt,
        };
        /*
         * Aliased to the entity's own names for the same reason the read repository aliases its own:
         * Dapper reads a result column by name, and `linked_entities` is not `LinkedEntities` to it —
         * a bare RETURNING hands the created note back with its campaign, its links and its timestamps
         * left at their defaults.
         */
        const string sql =
            @"INSERT INTO player_quicknote_queue
                (id, campaign_id, player_user_id, content, linked_entities, visible_to_players, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @PlayerUserId, @Content, @LinkedEntities::jsonb, @VisibleToPlayers, @CreatedAt, @UpdatedAt)
              RETURNING id,
                        campaign_id        AS CampaignId,
                        player_user_id     AS PlayerUserId,
                        content,
                        linked_entities    AS LinkedEntities,
                        visible_to_players AS VisibleToPlayers,
                        created_at         AS CreatedAt,
                        updated_at         AS UpdatedAt";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_quicknote_queue", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<PlayerQuicknoteQueueEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_quicknote_queue", @params, 1);

        return mapper.ToDomain(row);
    }
}

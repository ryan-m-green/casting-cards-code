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
            LinkedEntities = CampaignEventEntityMapper.ToJson(domain.LinkedEntities),
            domain.VisibleToPlayers,
            domain.UpdatedAt,
        };
        /*
         * Every column the write hands back is aliased to the entity's own name, the way the read
         * repository aliases its own. Dapper matches a result column to a property by name and does not
         * read `linked_entities` as `LinkedEntities`: an unaliased RETURNING came back with the links,
         * the campaign and the note's timestamps all left at their defaults — which is the note's line
         * the drawer was answered with, so a pick it had just written looked like one the queue had
         * refused (see the association picker's own reading of that answer).
         */
        const string sql =
            @"UPDATE player_quicknote_queue
              SET    content            = @Content,
                     linked_entities    = @LinkedEntities::jsonb,
                     visible_to_players = @VisibleToPlayers,
                     updated_at         = @UpdatedAt
              WHERE  id             = @Id
                AND  player_user_id = @PlayerUserId
              RETURNING id,
                        campaign_id        AS CampaignId,
                        player_user_id     AS PlayerUserId,
                        content,
                        linked_entities    AS LinkedEntities,
                        visible_to_players AS VisibleToPlayers,
                        created_at         AS CreatedAt,
                        updated_at         AS UpdatedAt";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_quicknote_queue", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<PlayerQuicknoteQueueEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "player_quicknote_queue", @params, 1);

        return mapper.ToDomain(row);
    }
}

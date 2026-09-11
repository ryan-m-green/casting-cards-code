using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IAmbianceUpdateRepository
{
    Task<AmbianceDomain> UpdateAsync(AmbianceDomain domain);
}

public class AmbianceUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IAmbianceEntityMapper mapper,
    IAmbianceItemEntityMapper itemMapper) : IAmbianceUpdateRepository
{
    public async Task<AmbianceDomain> UpdateAsync(AmbianceDomain domain)
    {
        var spanId = correlation.NewSpan();
        var entity = mapper.ToEntity(domain);

        const string headerSql =
            @"UPDATE campaign_ambiances
              SET title = @Title,
                  randomize_music = @RandomizeMusic
              WHERE id = @Id
              RETURNING id,
                        campaign_id AS CampaignId,
                        title,
                        randomize_music AS RandomizeMusic,
                        created_at  AS CreatedAt";

        const string itemSql =
            @"INSERT INTO campaign_ambiance_items
                (id, ambiance_id, soundtrack_id, sort_order, volume, pause_mode, pause_delay_seconds, pause_min_seconds, pause_max_seconds)
              VALUES
                (@Id, @AmbianceId, @SoundtrackId, @SortOrder, @Volume, @PauseMode, @PauseDelaySeconds, @PauseMinSeconds, @PauseMaxSeconds)
              RETURNING id,
                        ambiance_id           AS AmbianceId,
                        soundtrack_id         AS SoundtrackId,
                        sort_order            AS SortOrder,
                        volume                AS Volume,
                        pause_mode            AS PauseMode,
                        pause_delay_seconds   AS PauseDelaySeconds,
                        pause_min_seconds     AS PauseMinSeconds,
                        pause_max_seconds     AS PauseMaxSeconds";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_ambiances", entity);

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        var header = await conn.QuerySingleAsync<AmbianceEntity>(headerSql, entity, tx);

        await conn.ExecuteAsync(
            "DELETE FROM campaign_ambiance_items WHERE ambiance_id = @AmbianceId",
            new { AmbianceId = domain.Id },
            tx);

        var items = new List<AmbianceItemDomain>();
        for (var i = 0; i < domain.Items.Count; i++)
        {
            var item = domain.Items[i];
            item.AmbianceId = domain.Id;
            item.SortOrder = i;
            var row = await conn.QuerySingleAsync<AmbianceItemEntity>(itemSql, itemMapper.ToEntity(item), tx);
            items.Add(itemMapper.ToDomain(row));
        }

        await tx.CommitAsync();

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_ambiances", entity, 1);

        return new AmbianceDomain
        {
            Id = header.Id,
            CampaignId = header.CampaignId,
            Title = header.Title,
            CreatedAt = header.CreatedAt,
            RandomizeMusic = header.RandomizeMusic,
            Items = items
        };
    }
}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IAmbianceInsertRepository
{
    Task<AmbianceDomain> AddAsync(AmbianceDomain domain);
}

public class AmbianceInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IAmbianceEntityMapper mapper,
    IAmbianceItemEntityMapper itemMapper) : IAmbianceInsertRepository
{
    public async Task<AmbianceDomain> AddAsync(AmbianceDomain domain)
    {
        var spanId = correlation.NewSpan();
        var entity = mapper.ToEntity(domain);

        const string headerSql =
            @"INSERT INTO campaign_ambiances (id, campaign_id, title, randomize_music, created_at)
              VALUES (@Id, @CampaignId, @Title, @RandomizeMusic, @CreatedAt)
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

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_ambiances", entity);

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        var header = await conn.QuerySingleAsync<AmbianceEntity>(headerSql, entity, tx);

        var items = new List<AmbianceItemDomain>();
        for (var i = 0; i < domain.Items.Count; i++)
        {
            var item = domain.Items[i];
            item.AmbianceId = header.Id;
            item.SortOrder = i;
            var row = await conn.QuerySingleAsync<AmbianceItemEntity>(itemSql, itemMapper.ToEntity(item), tx);
            items.Add(itemMapper.ToDomain(row));
        }

        await tx.CommitAsync();

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_ambiances", entity, 1);

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

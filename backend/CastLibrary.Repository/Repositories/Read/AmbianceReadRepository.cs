using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IAmbianceReadRepository
{
    Task<List<AmbianceDomain>> GetByGmUserIdAsync(Guid gmUserId);
    Task<AmbianceDomain> GetByIdAsync(Guid ambianceId);
}

public class AmbianceReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IAmbianceItemEntityMapper itemMapper) : IAmbianceReadRepository
{
    private const string HeaderColumns =
        @"id,
          gm_user_id AS GmUserId,
          title,
          randomize_music AS RandomizeMusic,
          created_at  AS CreatedAt";

    private const string ItemColumns =
        @"id,
          ambiance_id           AS AmbianceId,
          soundtrack_id         AS SoundtrackId,
          sort_order            AS SortOrder,
          volume                AS Volume,
          pause_mode            AS PauseMode,
          pause_delay_seconds   AS PauseDelaySeconds,
          pause_min_seconds     AS PauseMinSeconds,
          pause_max_seconds     AS PauseMaxSeconds";

    public async Task<List<AmbianceDomain>> GetByGmUserIdAsync(Guid gmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { GmUserId = gmUserId };

        var headerSql =
            $@"SELECT {HeaderColumns}
               FROM ambiances
               WHERE gm_user_id = @GmUserId
               ORDER BY created_at ASC";

        const string itemSql =
            $@"SELECT {ItemColumns}
               FROM campaign_ambiance_items
               WHERE ambiance_id = ANY(@AmbianceIds)
               ORDER BY sort_order ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "ambiances", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var headers = (await conn.QueryAsync<AmbianceEntity>(headerSql, @params)).ToList();

        if (headers.Count == 0)
        {
            logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "ambiances", @params, 0);
            return [];
        }

        var ambianceIds = headers.Select(h => h.Id).ToArray();
        var items = (await conn.QueryAsync<AmbianceItemEntity>(itemSql, new { AmbianceIds = ambianceIds })).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "ambiances", @params, headers.Count);

        return headers.Select(h => new AmbianceDomain
        {
            Id = h.Id,
            GmUserId = h.GmUserId,
            Title = h.Title,
            CreatedAt = h.CreatedAt,
            RandomizeMusic = h.RandomizeMusic,
            Items = items.Where(i => i.AmbianceId == h.Id).Select(itemMapper.ToDomain).ToList()
        }).ToList();
    }

    public async Task<AmbianceDomain> GetByIdAsync(Guid ambianceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { AmbianceId = ambianceId };

        var headerSql =
            $@"SELECT {HeaderColumns}
               FROM ambiances
               WHERE id = @AmbianceId";

        const string itemSql =
            $@"SELECT {ItemColumns}
               FROM campaign_ambiance_items
               WHERE ambiance_id = @AmbianceId
               ORDER BY sort_order ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "ambiances", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var header = await conn.QueryFirstOrDefaultAsync<AmbianceEntity>(headerSql, @params);

        if (header is null)
        {
            logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "ambiances", @params, 0);
            return null;
        }

        var items = (await conn.QueryAsync<AmbianceItemEntity>(itemSql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "ambiances", @params, 1);

        return new AmbianceDomain
        {
            Id = header.Id,
            GmUserId = header.GmUserId,
            Title = header.Title,
            CreatedAt = header.CreatedAt,
            RandomizeMusic = header.RandomizeMusic,
            Items = items.Select(itemMapper.ToDomain).ToList()
        };
    }
}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ISoundtrackReadRepository
{
    Task<List<SoundtrackDomain>> GetByGmUserIdAsync(Guid gmUserId);
    Task<SoundtrackDomain> GetByIdAsync(Guid soundtrackId);
}

public class SoundtrackReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ISoundtrackEntityMapper mapper) : ISoundtrackReadRepository
{
    private const string Columns =
        @"id,
          gm_user_id         AS GmUserId,
          title,
          file_name          AS FileName,
          file_url           AS FileUrl,
          volume,
          is_loop            AS IsLoop,
          loop_delay_seconds AS LoopDelaySeconds,
          kind,
          created_at         AS CreatedAt";

    public async Task<List<SoundtrackDomain>> GetByGmUserIdAsync(Guid gmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { GmUserId = gmUserId };
        var sql =
            $@"SELECT {Columns}
               FROM soundtracks
               WHERE gm_user_id = @GmUserId
               ORDER BY created_at ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "soundtracks", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<SoundtrackEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "soundtracks", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }

    public async Task<SoundtrackDomain> GetByIdAsync(Guid soundtrackId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { SoundtrackId = soundtrackId };
        var sql =
            $@"SELECT {Columns}
               FROM soundtracks
               WHERE id = @SoundtrackId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "soundtracks", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<SoundtrackEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "soundtracks", @params, row != null ? 1 : 0);

        return row != null ? mapper.ToDomain(row) : null;
    }
}

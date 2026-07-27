using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ISoundtrackReadRepository
{
    Task<List<SoundtrackDomain>> GetByCampaignIdAsync(Guid campaignId);
    Task<SoundtrackDomain?> GetByIdAsync(Guid soundtrackId);
}

public class SoundtrackReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ISoundtrackEntityMapper mapper) : ISoundtrackReadRepository
{
    public async Task<List<SoundtrackDomain>> GetByCampaignIdAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT id,
                     campaign_id     AS CampaignId,
                     title,
                     file_name       AS FileName,
                     file_url        AS FileUrl,
                     volume,
                     is_loop         AS IsLoop,
                     loop_delay_seconds AS LoopDelaySeconds,
                     created_at      AS CreatedAt
              FROM campaign_soundtracks
              WHERE campaign_id = @CampaignId
              ORDER BY created_at ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_soundtracks", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<SoundtrackEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_soundtracks", @params, rows.Count);

        return rows.Select(mapper.ToDomain).ToList();
    }

    public async Task<SoundtrackDomain?> GetByIdAsync(Guid soundtrackId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { SoundtrackId = soundtrackId };
        const string sql =
            @"SELECT id,
                     campaign_id     AS CampaignId,
                     title,
                     file_name       AS FileName,
                     file_url        AS FileUrl,
                     volume,
                     is_loop         AS IsLoop,
                     loop_delay_seconds AS LoopDelaySeconds,
                     created_at      AS CreatedAt
              FROM campaign_soundtracks
              WHERE id = @SoundtrackId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_soundtracks", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<SoundtrackEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_soundtracks", @params, row != null ? 1 : 0);

        return row != null ? mapper.ToDomain(row) : null;
    }
}

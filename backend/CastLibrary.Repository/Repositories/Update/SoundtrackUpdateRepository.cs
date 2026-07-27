using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ISoundtrackUpdateRepository
{
    Task<SoundtrackDomain> UpdateAsync(SoundtrackDomain domain);
}

public class SoundtrackUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ISoundtrackEntityMapper mapper) : ISoundtrackUpdateRepository
{
    public async Task<SoundtrackDomain> UpdateAsync(SoundtrackDomain domain)
    {
        var spanId = correlation.NewSpan();
        var entity = mapper.ToEntity(domain);

        const string sql =
            @"UPDATE campaign_soundtracks
              SET title = @Title,
                  volume = @Volume,
                  is_loop = @IsLoop,
                  loop_delay_seconds = @LoopDelaySeconds
              WHERE id = @Id
              RETURNING id,
                        campaign_id     AS CampaignId,
                        title,
                        file_name       AS FileName,
                        file_url        AS FileUrl,
                        volume,
                        is_loop         AS IsLoop,
                        loop_delay_seconds AS LoopDelaySeconds,
                        created_at      AS CreatedAt";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_soundtracks", entity);

        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QuerySingleAsync<SoundtrackEntity>(sql, entity);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_soundtracks", entity, 1);

        return mapper.ToDomain(result);
    }
}

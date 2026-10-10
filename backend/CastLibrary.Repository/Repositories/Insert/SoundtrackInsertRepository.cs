using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ISoundtrackInsertRepository
{
    Task<SoundtrackDomain> AddAsync(SoundtrackDomain domain);

    /// <summary>Records that a campaign holds this library soundtrack. Idempotent.</summary>
    Task LinkAsync(Guid campaignId, Guid soundtrackId);
}

public class SoundtrackInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ISoundtrackEntityMapper mapper) : ISoundtrackInsertRepository
{
    public async Task<SoundtrackDomain> AddAsync(SoundtrackDomain domain)
    {
        var spanId = correlation.NewSpan();
        var entity = mapper.ToEntity(domain);
        
        const string sql =
            @"INSERT INTO soundtracks (id, gm_user_id, title, file_name, file_url, volume, is_loop, kind, created_at)
              VALUES (@Id, @GmUserId, @Title, @FileName, @FileUrl, @Volume, @IsLoop, @Kind, @CreatedAt)
              RETURNING id,
                        gm_user_id      AS GmUserId,
                        title,
                        file_name       AS FileName,
                        file_url        AS FileUrl,
                        volume,
                        is_loop         AS IsLoop,
                        kind,
                        created_at      AS CreatedAt";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "soundtracks", entity);

        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QuerySingleAsync<SoundtrackEntity>(sql, entity);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "soundtracks", entity, 1);

        return mapper.ToDomain(result);
    }

    public async Task LinkAsync(Guid campaignId, Guid soundtrackId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, SoundtrackId = soundtrackId };

        const string sql =
            @"INSERT INTO campaign_soundtracks_links (campaign_id, soundtrack_id)
              VALUES (@CampaignId, @SoundtrackId)
              ON CONFLICT DO NOTHING";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_soundtracks_links", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_soundtracks_links", @params, 1);
    }
}

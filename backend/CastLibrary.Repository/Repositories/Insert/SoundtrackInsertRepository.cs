using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ISoundtrackInsertRepository
{
    Task<SoundtrackDomain> AddAsync(SoundtrackDomain domain);
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
            @"INSERT INTO campaign_soundtracks (id, campaign_id, title, file_name, file_url, volume, is_loop, created_at)
              VALUES (@Id, @CampaignId, @Title, @FileName, @FileUrl, @Volume, @IsLoop, @CreatedAt)
              RETURNING id,
                        campaign_id     AS CampaignId,
                        title,
                        file_name       AS FileName,
                        file_url        AS FileUrl,
                        volume,
                        is_loop         AS IsLoop,
                        created_at      AS CreatedAt";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_soundtracks", entity);

        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QuerySingleAsync<SoundtrackEntity>(sql, entity);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_soundtracks", entity, 1);

        return mapper.ToDomain(result);
    }
}

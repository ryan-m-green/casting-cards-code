using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ISoundtrackEntityMapper
{
    SoundtrackDomain ToDomain(SoundtrackEntity entity);
    SoundtrackEntity ToEntity(SoundtrackDomain domain);
}

public class SoundtrackEntityMapper : ISoundtrackEntityMapper
{
    public SoundtrackDomain ToDomain(SoundtrackEntity entity)
    {
        return new SoundtrackDomain
        {
            Id = entity.Id,
            CampaignId = entity.CampaignId,
            Title = entity.Title,
            FileName = entity.FileName,
            FileUrl = entity.FileUrl,
            Volume = entity.Volume,
            IsLoop = entity.IsLoop,
            LoopDelaySeconds = entity.LoopDelaySeconds,
            CreatedAt = entity.CreatedAt
        };
    }

    public SoundtrackEntity ToEntity(SoundtrackDomain domain)
    {
        return new SoundtrackEntity
        {
            Id = domain.Id,
            CampaignId = domain.CampaignId,
            Title = domain.Title,
            FileName = domain.FileName,
            FileUrl = domain.FileUrl,
            Volume = domain.Volume,
            IsLoop = domain.IsLoop,
            LoopDelaySeconds = domain.LoopDelaySeconds,
            CreatedAt = domain.CreatedAt
        };
    }
}

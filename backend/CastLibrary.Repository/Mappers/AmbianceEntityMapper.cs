using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IAmbianceEntityMapper
{
    AmbianceDomain ToDomain(AmbianceEntity entity);
    AmbianceEntity ToEntity(AmbianceDomain domain);
}

public class AmbianceEntityMapper : IAmbianceEntityMapper
{
    public AmbianceDomain ToDomain(AmbianceEntity entity)
    {
        return new AmbianceDomain
        {
            Id = entity.Id,
            CampaignId = entity.CampaignId,
            Title = entity.Title,
            CreatedAt = entity.CreatedAt,
            RandomizeMusic = entity.RandomizeMusic
        };
    }

    public AmbianceEntity ToEntity(AmbianceDomain domain)
    {
        return new AmbianceEntity
        {
            Id = domain.Id,
            CampaignId = domain.CampaignId,
            Title = domain.Title,
            CreatedAt = domain.CreatedAt,
            RandomizeMusic = domain.RandomizeMusic
        };
    }
}

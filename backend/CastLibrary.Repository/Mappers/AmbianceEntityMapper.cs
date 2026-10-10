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
            GmUserId = entity.GmUserId,
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
            GmUserId = domain.GmUserId,
            Title = domain.Title,
            CreatedAt = domain.CreatedAt,
            RandomizeMusic = domain.RandomizeMusic
        };
    }
}

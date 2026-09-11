using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IAmbianceItemEntityMapper
{
    AmbianceItemDomain ToDomain(AmbianceItemEntity entity);
    AmbianceItemEntity ToEntity(AmbianceItemDomain domain);
}

public class AmbianceItemEntityMapper : IAmbianceItemEntityMapper
{
    public AmbianceItemDomain ToDomain(AmbianceItemEntity entity)
    {
        return new AmbianceItemDomain
        {
            Id = entity.Id,
            AmbianceId = entity.AmbianceId,
            SoundtrackId = entity.SoundtrackId,
            SortOrder = entity.SortOrder,
            Volume = entity.Volume,
            PauseMode = entity.PauseMode,
            PauseDelaySeconds = entity.PauseDelaySeconds,
            PauseMinSeconds = entity.PauseMinSeconds,
            PauseMaxSeconds = entity.PauseMaxSeconds
        };
    }

    public AmbianceItemEntity ToEntity(AmbianceItemDomain domain)
    {
        return new AmbianceItemEntity
        {
            Id = domain.Id,
            AmbianceId = domain.AmbianceId,
            SoundtrackId = domain.SoundtrackId,
            Volume = domain.Volume,
            SortOrder = domain.SortOrder,
            PauseMode = domain.PauseMode,
            PauseDelaySeconds = domain.PauseDelaySeconds,
            PauseMinSeconds = domain.PauseMinSeconds,
            PauseMaxSeconds = domain.PauseMaxSeconds
        };
    }
}

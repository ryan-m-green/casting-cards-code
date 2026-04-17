using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IPlayerCardConditionEntityMapper
{
    PlayerCardConditionDomain ToDomain(PlayerCardConditionEntity entity);
}

public class PlayerCardConditionEntityMapper : IPlayerCardConditionEntityMapper
{
    public PlayerCardConditionDomain ToDomain(PlayerCardConditionEntity entity) => new()
    {
        Id = entity.Id,
        PlayerCardId = entity.PlayerCardId,
        ConditionName = entity.ConditionName,
        AssignedAt = entity.AssignedAt,
    };
}

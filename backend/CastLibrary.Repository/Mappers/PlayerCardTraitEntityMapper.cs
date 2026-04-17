using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Repository.Mappers;

public interface IPlayerCardTraitEntityMapper
{
    PlayerCardTraitDomain ToDomain(PlayerCardTraitEntity entity);
}

public class PlayerCardTraitEntityMapper : IPlayerCardTraitEntityMapper
{
    public PlayerCardTraitDomain ToDomain(PlayerCardTraitEntity entity) => new()
    {
        Id = entity.Id,
        PlayerCardId = entity.PlayerCardId,
        TraitType = Enum.Parse<TraitType>(entity.TraitType),
        Content = entity.Content,
        IsCompleted = entity.IsCompleted,
        CreatedAt = entity.CreatedAt,
    };
}

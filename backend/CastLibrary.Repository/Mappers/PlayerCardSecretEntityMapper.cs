using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IPlayerCardSecretEntityMapper
{
    PlayerCardSecretDomain ToDomain(PlayerCardSecretEntity entity);
}

public class PlayerCardSecretEntityMapper : IPlayerCardSecretEntityMapper
{
    public PlayerCardSecretDomain ToDomain(PlayerCardSecretEntity entity) => new()
    {
        Id = entity.Id,
        PlayerCardId = entity.PlayerCardId,
        Content = entity.Content,
        IsShared = entity.IsShared,
        SharedAt = entity.SharedAt,
        SharedBy = entity.SharedBy,
        CreatedAt = entity.CreatedAt,
    };
}

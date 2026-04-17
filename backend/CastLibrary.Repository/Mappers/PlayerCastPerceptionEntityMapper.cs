using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IPlayerCastPerceptionEntityMapper
{
    PlayerCastPerceptionDomain ToDomain(PlayerCastPerceptionEntity entity);
}

public class PlayerCastPerceptionEntityMapper : IPlayerCastPerceptionEntityMapper
{
    public PlayerCastPerceptionDomain ToDomain(PlayerCastPerceptionEntity entity) => new()
    {
        Id = entity.Id,
        PlayerCardId = entity.PlayerCardId,
        CastInstanceId = entity.CastInstanceId,
        LocationInstanceId = entity.LocationInstanceId,
        SublocationInstanceId = entity.SublocationInstanceId,
        Impression = entity.Impression,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
    };
}

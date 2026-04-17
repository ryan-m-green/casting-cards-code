using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Repository.Mappers;

public interface IPlayerCardMemoryEntityMapper
{
    PlayerCardMemoryDomain ToDomain(PlayerCardMemoryEntity entity);
}

public class PlayerCardMemoryEntityMapper : IPlayerCardMemoryEntityMapper
{
    public PlayerCardMemoryDomain ToDomain(PlayerCardMemoryEntity entity) => new()
    {
        Id = entity.Id,
        PlayerCardId = entity.PlayerCardId,
        MemoryType = Enum.Parse<MemoryType>(entity.MemoryType),
        SessionNumber = entity.SessionNumber,
        Title = entity.Title,
        Detail = entity.Detail,
        MemoryDate = DateOnly.Parse(entity.MemoryDate),
        CreatedAt = entity.CreatedAt,
    };
}

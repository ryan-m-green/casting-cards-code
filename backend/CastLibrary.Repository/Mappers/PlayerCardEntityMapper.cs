using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IPlayerCardEntityMapper
{
    PlayerCardDomain ToDomain(PlayerCardEntity entity);
}

public class PlayerCardEntityMapper : IPlayerCardEntityMapper
{
    public PlayerCardDomain ToDomain(PlayerCardEntity entity) => new()
    {
        Id = entity.Id,
        CampaignId = entity.CampaignId,
        PlayerUserId = entity.PlayerUserId,
        Name = entity.Name,
        Race = entity.Race,
        Class = entity.Class,
        Description = entity.Description,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
    };
}

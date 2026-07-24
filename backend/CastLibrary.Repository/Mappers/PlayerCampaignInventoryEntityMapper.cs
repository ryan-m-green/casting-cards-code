using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IPlayerCampaignInventoryEntityMapper
{
    PlayerCampaignInventoryDomain ToDomain(PlayerCampaignInventoryEntity entity);
}

public class PlayerCampaignInventoryEntityMapper : IPlayerCampaignInventoryEntityMapper
{
    public PlayerCampaignInventoryDomain ToDomain(PlayerCampaignInventoryEntity entity) => new()
    {
        Id = entity.Id,
        CampaignId = entity.CampaignId,
        PlayerUserId = entity.PlayerUserId,
        Name = entity.Name,
        Description = entity.Description,
        Count = entity.Count,
    };
}

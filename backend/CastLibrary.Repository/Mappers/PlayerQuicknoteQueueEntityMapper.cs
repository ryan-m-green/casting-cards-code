using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IPlayerQuicknoteQueueEntityMapper
{
    PlayerQuicknoteQueueDomain ToDomain(PlayerQuicknoteQueueEntity entity);
    PlayerQuicknoteQueueEntity ToEntity(PlayerQuicknoteQueueDomain domain);
}

public class PlayerQuicknoteQueueEntityMapper : IPlayerQuicknoteQueueEntityMapper
{
    public PlayerQuicknoteQueueDomain ToDomain(PlayerQuicknoteQueueEntity entity) => new()
    {
        Id           = entity.Id,
        CampaignId   = entity.CampaignId,
        PlayerUserId = entity.PlayerUserId,
        Content      = entity.Content,
        CreatedAt    = entity.CreatedAt,
        UpdatedAt    = entity.UpdatedAt,
    };

    public PlayerQuicknoteQueueEntity ToEntity(PlayerQuicknoteQueueDomain domain) => new()
    {
        Id           = domain.Id,
        CampaignId   = domain.CampaignId,
        PlayerUserId = domain.PlayerUserId,
        Content      = domain.Content,
        CreatedAt    = domain.CreatedAt,
        UpdatedAt    = domain.UpdatedAt,
    };
}

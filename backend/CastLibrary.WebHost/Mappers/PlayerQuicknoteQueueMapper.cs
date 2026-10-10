using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface IPlayerQuicknoteQueueMapper
{
    PlayerQuicknoteQueueItemResponse ToResponse(PlayerQuicknoteQueueDomain domain);
}

public class PlayerQuicknoteQueueMapper : IPlayerQuicknoteQueueMapper
{
    public PlayerQuicknoteQueueItemResponse ToResponse(PlayerQuicknoteQueueDomain domain) => new()
    {
        Id               = domain.Id,
        CampaignId       = domain.CampaignId,
        Content          = domain.Content,
        LinkedEntities   = domain.LinkedEntities,
        VisibleToPlayers = domain.VisibleToPlayers,
        CreatedAt        = domain.CreatedAt,
        UpdatedAt        = domain.UpdatedAt,
    };
}

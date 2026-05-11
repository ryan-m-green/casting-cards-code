using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface ICampaignEventWebMapper
{
    CampaignEventResponse ToResponse(CampaignEventDomain domain);
}

public class CampaignEventWebMapper(IImageStorageOperator imageStorage) : ICampaignEventWebMapper
{
    public CampaignEventResponse ToResponse(CampaignEventDomain domain) => new()
    {
        Id               = domain.Id,
        CampaignId       = domain.CampaignId,
        Title            = domain.Title,
        Body             = domain.Body,
        SortOrder        = domain.SortOrder,
        LinkedEntityId   = domain.LinkedEntityId,
        LinkedEntityType = domain.LinkedEntityType,
        VisibleToPlayers = domain.VisibleToPlayers,
        ImageUrl         = !string.IsNullOrEmpty(domain.FilePath) ? imageStorage.GetPublicUrl(domain.FilePath) : null,
        TodPositionPercent = domain.TodPositionPercent,
        CreatedAt        = domain.CreatedAt,
    };
}

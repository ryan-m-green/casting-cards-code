using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface ICampaignEventWebMapper
{
    CampaignEventResponse ToResponse(CampaignStorylineDomain domain);
}

public class CampaignEventWebMapper : ICampaignEventWebMapper
{
    public CampaignEventResponse ToResponse(CampaignStorylineDomain domain) => new()
    {
        Id = domain.Id,
        CampaignId = domain.CampaignId,
        Title = domain.Title,
        Body = domain.Body,
        SortOrder = domain.SortOrder,
        LinkedEntities = domain.LinkedEntities,
        VisibleToPlayers = domain.VisibleToPlayers,
        MarkedForArchive = domain.MarkedForArchive,
        ImageUrl = domain.ImageUrl,
        SceneType = domain.SceneType ?? "campaign-event",
        CreatedAt = domain.CreatedAt,
    };
}

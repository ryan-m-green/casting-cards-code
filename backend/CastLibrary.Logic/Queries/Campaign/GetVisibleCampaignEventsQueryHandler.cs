using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetVisibleCampaignEventsQueryHandler
{
    Task<List<CampaignStorylineDomain>> HandleAsync(GetVisibleCampaignEventsQuery query);
}

public class GetVisibleCampaignEventsQueryHandler(
    IStorylineReadRepository repository,
    IImageStorageOperator imageStorageOperator) : IGetVisibleCampaignEventsQueryHandler
{
    public async Task<List<CampaignStorylineDomain>> HandleAsync(GetVisibleCampaignEventsQuery query)
    {
        var events = await repository.GetVisibleByCampaignIdAsync(query.CampaignId);
        
        foreach (var ev in events)
        {
            if (!string.IsNullOrEmpty(ev.FilePath))
            {
                ev.ImageUrl = imageStorageOperator.GetPublicUrl(ev.FilePath);
            }
            else
            {
                ev.ImageUrl = null;
            }
        }
        
        return events;
    }
}

public class GetVisibleCampaignEventsQuery
{
    public GetVisibleCampaignEventsQuery(Guid campaignId) => CampaignId = campaignId;
    public Guid CampaignId { get; }
}

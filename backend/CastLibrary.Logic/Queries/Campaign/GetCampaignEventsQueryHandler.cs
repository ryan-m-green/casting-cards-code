using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignEventsQueryHandler
{
    Task<List<CampaignEventDomain>> HandleAsync(GetCampaignEventsQuery query);
}

public class GetCampaignEventsQueryHandler(
    IStorylineReadRepository repository,
    IImageStorageOperator imageStorageOperator) : IGetCampaignEventsQueryHandler
{
    public async Task<List<CampaignEventDomain>> HandleAsync(GetCampaignEventsQuery query)
    {
        var events = await repository.GetByCampaignIdAsync(query.CampaignId);
        
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

public class GetCampaignEventsQuery
{
    public GetCampaignEventsQuery(Guid campaignId) => CampaignId = campaignId;
    public Guid CampaignId { get; }
}

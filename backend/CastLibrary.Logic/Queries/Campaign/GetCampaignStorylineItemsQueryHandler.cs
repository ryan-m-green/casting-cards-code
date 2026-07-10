using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignStorylineItemsQueryHandler
{
    Task<List<CampaignStorylineDomain>> HandleAsync(GetCampaignStorylineItemsQuery query);
}

public class GetCampaignStorylineItemsQueryHandler(
    IStorylineReadRepository repository,
    IImageStorageOperator imageStorageOperator) : IGetCampaignStorylineItemsQueryHandler
{
    public async Task<List<CampaignStorylineDomain>> HandleAsync(GetCampaignStorylineItemsQuery query)
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

public class GetCampaignStorylineItemsQuery
{
    public GetCampaignStorylineItemsQuery(Guid campaignId) => CampaignId = campaignId;
    public Guid CampaignId { get; }
}

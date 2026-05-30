using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignEventsQueryHandler
{
    Task<List<CampaignEventDomain>> HandleAsync(GetCampaignEventsQuery query);
}

public class GetCampaignEventsQueryHandler(
    IStorylineReadRepository repository) : IGetCampaignEventsQueryHandler
{
    public Task<List<CampaignEventDomain>> HandleAsync(GetCampaignEventsQuery query)
        => repository.GetByCampaignIdAsync(query.CampaignId);
}

public class GetCampaignEventsQuery
{
    public GetCampaignEventsQuery(Guid campaignId) => CampaignId = campaignId;
    public Guid CampaignId { get; }
}

using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetVisibleCampaignEventsQueryHandler
{
    Task<List<CampaignEventDomain>> HandleAsync(GetVisibleCampaignEventsQuery query);
}

public class GetVisibleCampaignEventsQueryHandler(
    ICampaignEventReadRepository repository) : IGetVisibleCampaignEventsQueryHandler
{
    public Task<List<CampaignEventDomain>> HandleAsync(GetVisibleCampaignEventsQuery query)
        => repository.GetVisibleByCampaignIdAsync(query.CampaignId);
}

public class GetVisibleCampaignEventsQuery
{
    public GetVisibleCampaignEventsQuery(Guid campaignId) => CampaignId = campaignId;
    public Guid CampaignId { get; }
}

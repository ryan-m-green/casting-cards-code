using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignFactionInstancesQueryHandler
{
    Task<List<CampaignFactionInstanceDomain>> HandleAsync(Guid campaignId, Guid dmUserId);
}

public class GetCampaignFactionInstancesQueryHandler(
    ICampaignReadRepository campaignReadRepository) : IGetCampaignFactionInstancesQueryHandler
{
    public async Task<List<CampaignFactionInstanceDomain>> HandleAsync(Guid campaignId, Guid dmUserId)
    {
        return await campaignReadRepository.GetFactionInstancesByCampaignAsync(campaignId, dmUserId);
    }
}

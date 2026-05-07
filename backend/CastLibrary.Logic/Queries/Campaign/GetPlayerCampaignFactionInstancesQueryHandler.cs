using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetPlayerCampaignFactionInstancesQueryHandler
{
    Task<List<CampaignFactionInstanceDomain>> HandleAsync(Guid campaignId);
}

public class GetPlayerCampaignFactionInstancesQueryHandler(
    ICampaignReadRepository campaignReadRepository) : IGetPlayerCampaignFactionInstancesQueryHandler
{
    public async Task<List<CampaignFactionInstanceDomain>> HandleAsync(Guid campaignId)
    {
        return await campaignReadRepository.GetFactionInstancesForPlayerAsync(campaignId);
    }
}

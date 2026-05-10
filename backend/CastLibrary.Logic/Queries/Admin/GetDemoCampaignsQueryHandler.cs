using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Admin;

public interface IGetDemoCampaignsQueryHandler
{
    Task<List<CampaignDomain>> HandleAsync();
}

public class GetDemoCampaignsQueryHandler(ICampaignReadRepository campaignReadRepository) : IGetDemoCampaignsQueryHandler
{
    public async Task<List<CampaignDomain>> HandleAsync()
    {
        return await campaignReadRepository.GetAllDemoAsync();
    }
}

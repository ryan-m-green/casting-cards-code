using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignLibraryQueryHandler
{
    Task<List<CampaignDomain>> HandleAsync(Guid dmUserId);
}
public class GetCampaignLibraryQueryHandler(ICampaignReadRepository campaignRepository) : IGetCampaignLibraryQueryHandler
{
    public Task<List<CampaignDomain>> HandleAsync(Guid dmUserId) =>
        campaignRepository.GetAllByDmAsync(dmUserId);
}

using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetPlayerCampaignLibraryQueryHandler
{
    Task<List<CampaignDomain>> HandleAsync(Guid playerUserId);
}

public class GetPlayerCampaignLibraryQueryHandler(ICampaignReadRepository campaignRepository) : IGetPlayerCampaignLibraryQueryHandler
{
    public Task<List<CampaignDomain>> HandleAsync(Guid playerUserId) =>
        campaignRepository.GetAllByPlayerAsync(playerUserId);
}

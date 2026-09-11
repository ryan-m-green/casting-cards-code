using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Ambiance;

public interface IGetCampaignAmbiancesQueryHandler
{
    Task<List<AmbianceDomain>> HandleAsync(GetCampaignAmbiancesQuery query);
}

public class GetCampaignAmbiancesQueryHandler(
    IAmbianceReadRepository readRepository) : IGetCampaignAmbiancesQueryHandler
{
    public async Task<List<AmbianceDomain>> HandleAsync(GetCampaignAmbiancesQuery query)
    {
        return await readRepository.GetByCampaignIdAsync(query.CampaignId);
    }
}

public class GetCampaignAmbiancesQuery
{
    public GetCampaignAmbiancesQuery(Guid campaignId)
    {
        CampaignId = campaignId;
    }

    public Guid CampaignId { get; }
}

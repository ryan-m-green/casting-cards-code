using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Encounter;

public interface IGetCampaignEncountersQueryHandler
{
    Task<List<CampaignEncounterDomain>> HandleAsync(Guid campaignId);
}

public class GetCampaignEncountersQueryHandler(IEncounterReadRepository readRepository) : IGetCampaignEncountersQueryHandler
{
    public Task<List<CampaignEncounterDomain>> HandleAsync(Guid campaignId) =>
        readRepository.GetEncountersByCampaignAsync(campaignId);
}

public interface IGetEncounterDetailQueryHandler
{
    Task<CampaignEncounterDomain> HandleAsync(Guid encounterId);
}

public class GetEncounterDetailQueryHandler(IEncounterReadRepository readRepository) : IGetEncounterDetailQueryHandler
{
    public Task<CampaignEncounterDomain> HandleAsync(Guid encounterId) =>
        readRepository.GetEncounterByIdAsync(encounterId);
}

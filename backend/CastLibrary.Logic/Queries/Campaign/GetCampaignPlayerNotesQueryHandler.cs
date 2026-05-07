using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignPlayerNotesQueryHandler
{
    Task<CampaignPlayerNotesDomain> HandleAsync(Guid campaignId);
}

public class GetCampaignPlayerNotesQueryHandler(ICampaignPlayerNotesReadRepository repository) : IGetCampaignPlayerNotesQueryHandler
{
    public Task<CampaignPlayerNotesDomain> HandleAsync(Guid campaignId) =>
        repository.GetByCampaignAsync(campaignId);
}

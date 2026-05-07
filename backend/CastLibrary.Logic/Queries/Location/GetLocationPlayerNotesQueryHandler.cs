using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Location;

public interface IGetLocationPlayerNotesQueryHandler
{
    Task<CampaignLocationPlayerNotesDomain> HandleAsync(Guid campaignId, Guid locationInstanceId);
}

public class GetLocationPlayerNotesQueryHandler(ILocationPlayerNotesReadRepository repository) : IGetLocationPlayerNotesQueryHandler
{
    public Task<CampaignLocationPlayerNotesDomain> HandleAsync(Guid campaignId, Guid locationInstanceId) =>
        repository.GetByLocationInstanceAsync(campaignId, locationInstanceId);
}

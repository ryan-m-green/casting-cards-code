using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Sublocation;

public interface IGetSublocationPlayerNotesQueryHandler
{
    Task<CampaignSublocationPlayerNotesDomain> HandleAsync(Guid campaignId, Guid sublocationInstanceId);
}

public class GetSublocationPlayerNotesQueryHandler(ISublocationPlayerNotesReadRepository repository) : IGetSublocationPlayerNotesQueryHandler
{
    public Task<CampaignSublocationPlayerNotesDomain> HandleAsync(Guid campaignId, Guid sublocationInstanceId) =>
        repository.GetBySublocationInstanceAsync(campaignId, sublocationInstanceId);
}

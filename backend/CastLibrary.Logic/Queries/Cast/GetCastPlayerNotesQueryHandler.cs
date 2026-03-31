using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Cast;

public interface IGetCastPlayerNotesQueryHandler
{
    Task<CampaignCastPlayerNotesDomain> HandleAsync(Guid campaignId, Guid castInstanceId);
    Task<List<CampaignCastPlayerNotesDomain>> HandleByCastInstancesAsync(Guid campaignId, List<Guid> castInstanceIds);
}

public class GetCastPlayerNotesQueryHandler(ICastPlayerNotesReadRepository repository) : IGetCastPlayerNotesQueryHandler
{
    public Task<CampaignCastPlayerNotesDomain> HandleAsync(Guid campaignId, Guid castInstanceId) =>
        repository.GetByCastInstanceAsync(campaignId, castInstanceId);

    public Task<List<CampaignCastPlayerNotesDomain>> HandleByCastInstancesAsync(Guid campaignId, List<Guid> castInstanceIds) =>
        repository.GetByCastInstancesAsync(campaignId, castInstanceIds);
}

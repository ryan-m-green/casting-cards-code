using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Faction;

public interface IGetFactionPlayerNotesQueryHandler
{
    Task<CampaignFactionPlayerNotesDomain?> HandleAsync(Guid campaignId, Guid factionInstanceId);
}

public class GetFactionPlayerNotesQueryHandler(
    IFactionPlayerNotesReadRepository readRepository) : IGetFactionPlayerNotesQueryHandler
{
    public Task<CampaignFactionPlayerNotesDomain?> HandleAsync(Guid campaignId, Guid factionInstanceId)
        => readRepository.GetByFactionInstanceAsync(campaignId, factionInstanceId);
}

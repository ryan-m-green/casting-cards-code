using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IClearFactionCastMemberPrimaryCommandHandler
{
    /// <summary>
    /// Takes the crown off a faction, on the side <paramref name="party"/> names: the party's own
    /// membership (no `dm_user_id`) or the GM's. Callers that say nothing clear the GM's own, as
    /// this always did.
    /// </summary>
    Task HandleAsync(Guid factionInstanceId, bool party = false);
}

public class ClearFactionCastMemberPrimaryCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : IClearFactionCastMemberPrimaryCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId, bool party)
    {
        await campaignInsertRepository.ClearFactionCastMemberPrimaryAsync(factionInstanceId, party);
    }
}

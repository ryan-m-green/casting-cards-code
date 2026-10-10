using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface ISetFactionCastMemberPrimaryCommandHandler
{
    /// <summary>
    /// Sets a faction's leader. <paramref name="party"/> says whose membership the crown is set
    /// on: the party writes their own (no `dm_user_id`), the GM writes theirs. Callers that say
    /// nothing write the GM's own, as this always did.
    /// </summary>
    Task HandleAsync(Guid factionInstanceId, Guid castInstanceId, bool party = false);
}

public class SetFactionCastMemberPrimaryCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : ISetFactionCastMemberPrimaryCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId, Guid castInstanceId, bool party)
    {
        await campaignInsertRepository.SetFactionCastMemberPrimaryAsync(factionInstanceId, castInstanceId, party);
    }
}

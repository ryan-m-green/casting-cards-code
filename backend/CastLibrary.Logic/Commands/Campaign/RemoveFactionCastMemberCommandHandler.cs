using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IRemoveFactionCastMemberCommandHandler
{
    /// <summary>
    /// Takes a cast card off a faction. <paramref name="party"/> says whose membership is broken:
    /// the party's own (no `dm_user_id`) or the GM's. Callers that say nothing break the GM's own,
    /// as this always did.
    /// </summary>
    Task HandleAsync(Guid factionInstanceId, Guid castInstanceId, bool party = false);
}

public class RemoveFactionCastMemberCommandHandler(
    ICampaignDeleteRepository campaignDeleteRepository) : IRemoveFactionCastMemberCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId, Guid castInstanceId, bool party = false)
    {
        await campaignDeleteRepository.RemoveFactionCastMemberAsync(factionInstanceId, castInstanceId, party);
    }
}

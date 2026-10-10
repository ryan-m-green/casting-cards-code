using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IRemoveFactionRelationshipCommandHandler
{
    /// <summary>
    /// Takes back a faction relationship. <paramref name="party"/> says whose tie is broken: the
    /// party's own (no `gm_user_id`) or the GM's. Only the side that wove it may take it back — the
    /// caller is told apart on the same `gm_user_id` their tie was written with — so the party's
    /// ties are the party's alone to work and the GM's are the GM's. Callers that say nothing break
    /// the GM's own, as this always did.
    /// </summary>
    Task HandleAsync(Guid relationshipId, bool party = false);
}

public class RemoveFactionRelationshipCommandHandler(
    ICampaignDeleteRepository campaignDeleteRepository) : IRemoveFactionRelationshipCommandHandler
{
    public async Task HandleAsync(Guid relationshipId, bool party = false)
    {
        await campaignDeleteRepository.DeleteFactionRelationshipAsync(relationshipId, party);
    }
}

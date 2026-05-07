using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IRemoveFactionRelationshipCommandHandler
{
    Task HandleAsync(Guid relationshipId);
}

public class RemoveFactionRelationshipCommandHandler(
    ICampaignDeleteRepository campaignDeleteRepository) : IRemoveFactionRelationshipCommandHandler
{
    public async Task HandleAsync(Guid relationshipId)
    {
        await campaignDeleteRepository.DeleteFactionRelationshipAsync(relationshipId);
    }
}

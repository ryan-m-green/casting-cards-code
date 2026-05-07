using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IRemoveFactionCastMemberCommandHandler
{
    Task HandleAsync(Guid factionInstanceId, Guid castInstanceId);
}

public class RemoveFactionCastMemberCommandHandler(
    ICampaignDeleteRepository campaignDeleteRepository) : IRemoveFactionCastMemberCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId, Guid castInstanceId)
    {
        await campaignDeleteRepository.RemoveFactionCastMemberAsync(factionInstanceId, castInstanceId);
    }
}

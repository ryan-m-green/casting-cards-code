using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddFactionCastMemberCommandHandler
{
    Task HandleAsync(Guid factionInstanceId, Guid castInstanceId, Guid? dmUserId);
}

public class AddFactionCastMemberCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : IAddFactionCastMemberCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId, Guid castInstanceId, Guid? dmUserId)
    {
        await campaignInsertRepository.AddFactionCastMemberAsync(factionInstanceId, castInstanceId, dmUserId);
    }
}

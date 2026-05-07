using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface ISetFactionCastMemberPrimaryCommandHandler
{
    Task HandleAsync(Guid factionInstanceId, Guid castInstanceId);
}

public class SetFactionCastMemberPrimaryCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : ISetFactionCastMemberPrimaryCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId, Guid castInstanceId)
    {
        await campaignInsertRepository.SetFactionCastMemberPrimaryAsync(factionInstanceId, castInstanceId);
    }
}

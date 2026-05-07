using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IClearFactionCastMemberPrimaryCommandHandler
{
    Task HandleAsync(Guid factionInstanceId);
}

public class ClearFactionCastMemberPrimaryCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : IClearFactionCastMemberPrimaryCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId)
    {
        await campaignInsertRepository.ClearFactionCastMemberPrimaryAsync(factionInstanceId);
    }
}

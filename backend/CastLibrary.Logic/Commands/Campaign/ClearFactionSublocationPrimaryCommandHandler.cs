using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IClearFactionSublocationPrimaryCommandHandler
{
    Task HandleAsync(Guid factionInstanceId);
}

public class ClearFactionSublocationPrimaryCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : IClearFactionSublocationPrimaryCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId)
    {
        await campaignInsertRepository.ClearFactionSublocationPrimaryAsync(factionInstanceId);
    }
}

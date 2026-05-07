using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface ISetFactionSublocationPrimaryCommandHandler
{
    Task HandleAsync(Guid factionInstanceId, Guid sublocationInstanceId);
}

public class SetFactionSublocationPrimaryCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : ISetFactionSublocationPrimaryCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId, Guid sublocationInstanceId)
    {
        await campaignInsertRepository.SetFactionSublocationPrimaryAsync(factionInstanceId, sublocationInstanceId);
    }
}

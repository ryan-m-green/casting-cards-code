using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IRemoveFactionSublocationCommandHandler
{
    Task HandleAsync(Guid factionInstanceId, Guid sublocationInstanceId);
}

public class RemoveFactionSublocationCommandHandler(
    ICampaignDeleteRepository campaignDeleteRepository) : IRemoveFactionSublocationCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId, Guid sublocationInstanceId)
    {
        await campaignDeleteRepository.RemoveFactionSublocationAsync(factionInstanceId, sublocationInstanceId);
    }
}

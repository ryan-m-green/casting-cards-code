using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddFactionSublocationCommandHandler
{
    Task HandleAsync(Guid factionInstanceId, Guid sublocationInstanceId, Guid? dmUserId);
}

public class AddFactionSublocationCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : IAddFactionSublocationCommandHandler
{
    public async Task HandleAsync(Guid factionInstanceId, Guid sublocationInstanceId, Guid? dmUserId)
    {
        await campaignInsertRepository.AddFactionSublocationAsync(factionInstanceId, sublocationInstanceId, dmUserId);
    }
}

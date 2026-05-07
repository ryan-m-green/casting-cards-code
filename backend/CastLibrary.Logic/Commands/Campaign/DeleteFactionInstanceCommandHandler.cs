using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteFactionInstanceCommandHandler
{
    Task HandleAsync(DeleteFactionInstanceCommand command);
}

public class DeleteFactionInstanceCommandHandler(
    ICampaignDeleteRepository campaignDeleteRepository,
    ICampaignUpdateRepository campaignUpdateRepository) : IDeleteFactionInstanceCommandHandler
{
    public async Task HandleAsync(DeleteFactionInstanceCommand command)
    {
        await campaignUpdateRepository.ClearFactionFromSublocationInstancesAsync(command.FactionInstanceId);
        await campaignUpdateRepository.ClearFactionFromCastInstancesAsync(command.FactionInstanceId);
        await campaignDeleteRepository.DeleteFactionInstanceAsync(command.FactionInstanceId);
    }
}

public class DeleteFactionInstanceCommand
{
    public DeleteFactionInstanceCommand(Guid campaignId, Guid factionInstanceId)
    {
        CampaignId        = campaignId;
        FactionInstanceId = factionInstanceId;
    }
    public Guid CampaignId { get; }
    public Guid FactionInstanceId { get; }
}

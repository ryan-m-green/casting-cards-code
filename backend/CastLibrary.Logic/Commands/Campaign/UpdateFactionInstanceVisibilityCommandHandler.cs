using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateFactionInstanceVisibilityCommandHandler
{
    Task HandleAsync(UpdateFactionInstanceVisibilityCommand command);
}

public class UpdateFactionInstanceVisibilityCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateFactionInstanceVisibilityCommandHandler
{
    public async Task HandleAsync(UpdateFactionInstanceVisibilityCommand command)
    {
        await campaignRepository.UpdateFactionInstanceVisibilityAsync(command.InstanceId, command.Request.IsVisibleToPlayers);

        if (!command.Request.IsVisibleToPlayers)
        {
            await campaignRepository.ClearFactionFromSublocationInstancesAsync(command.InstanceId);
            await campaignRepository.ClearFactionFromCastInstancesAsync(command.InstanceId);
        }
    }
}

public class UpdateFactionInstanceVisibilityCommand
{
    public UpdateFactionInstanceVisibilityCommand(Guid instanceId, UpdateFactionInstanceVisibilityRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateFactionInstanceVisibilityRequest Request { get; }
}

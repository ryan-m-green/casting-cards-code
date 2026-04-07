using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateSublocationInstanceVisibilityCommandHandler
{
    Task HandleAsync(UpdateSublocationInstanceVisibilityCommand command);
}

public class UpdateSublocationInstanceVisibilityCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateSublocationInstanceVisibilityCommandHandler
{
    public async Task HandleAsync(UpdateSublocationInstanceVisibilityCommand command)
    {
        await campaignRepository.UpdateSublocationInstanceVisibilityAsync(command.InstanceId, command.Request.IsVisibleToPlayers);
    }
}

public class UpdateSublocationInstanceVisibilityCommand
{
    public UpdateSublocationInstanceVisibilityCommand(Guid instanceId, UpdateSublocationInstanceVisibilityRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateSublocationInstanceVisibilityRequest Request { get; }
}

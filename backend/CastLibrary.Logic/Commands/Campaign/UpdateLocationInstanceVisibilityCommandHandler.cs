using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateLocationInstanceVisibilityCommandHandler
{
    Task HandleAsync(UpdateLocationInstanceVisibilityCommand command);
}

public class UpdateLocationInstanceVisibilityCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateLocationInstanceVisibilityCommandHandler
{
    public async Task HandleAsync(UpdateLocationInstanceVisibilityCommand command)
    {
        await campaignRepository.UpdateLocationInstanceVisibilityAsync(command.InstanceId, command.Request.IsVisibleToPlayers);
    }
}

public class UpdateLocationInstanceVisibilityCommand
{
    public UpdateLocationInstanceVisibilityCommand(Guid instanceId, UpdateLocationInstanceVisibilityRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateLocationInstanceVisibilityRequest Request { get; }
}

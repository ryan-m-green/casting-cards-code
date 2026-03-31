using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCastInstanceVisibilityCommandHandler
{
    Task HandleAsync(UpdateCastInstanceVisibilityCommand command);
}

public class UpdateCastInstanceVisibilityCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateCastInstanceVisibilityCommandHandler
{
    public async Task HandleAsync(UpdateCastInstanceVisibilityCommand command)
    {
        await campaignRepository.UpdateCastInstanceVisibilityAsync(command.InstanceId, command.Request.IsVisibleToPlayers);
    }
}

public class UpdateCastInstanceVisibilityCommand
{
    public UpdateCastInstanceVisibilityCommand(Guid instanceId, UpdateCastInstanceVisibilityRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateCastInstanceVisibilityRequest Request { get; }
}

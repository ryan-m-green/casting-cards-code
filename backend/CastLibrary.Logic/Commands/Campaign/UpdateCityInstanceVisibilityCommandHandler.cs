using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCityInstanceVisibilityCommandHandler
{
    Task HandleAsync(UpdateCityInstanceVisibilityCommand command);
}

public class UpdateCityInstanceVisibilityCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateCityInstanceVisibilityCommandHandler
{
    public async Task HandleAsync(UpdateCityInstanceVisibilityCommand command)
    {
        await campaignRepository.UpdateCityInstanceVisibilityAsync(command.InstanceId, command.Request.IsVisibleToPlayers);
    }
}

public class UpdateCityInstanceVisibilityCommand
{
    public UpdateCityInstanceVisibilityCommand(Guid instanceId, UpdateCityInstanceVisibilityRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateCityInstanceVisibilityRequest Request { get; }
}

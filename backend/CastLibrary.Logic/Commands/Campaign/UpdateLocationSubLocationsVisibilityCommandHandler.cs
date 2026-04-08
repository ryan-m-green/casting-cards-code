using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateLocationSublocationsVisibilityCommandHandler
{
    Task HandleAsync(UpdateLocationSublocationsVisibilityCommand command);
}

public class UpdateLocationSubLocationsVisibilityCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateLocationSublocationsVisibilityCommandHandler
{
    public async Task HandleAsync(UpdateLocationSublocationsVisibilityCommand command)
    {
        await campaignRepository.UpdateLocationSublocationsVisibilityAsync(command.LocationInstanceId, command.Request.IsVisibleToPlayers);
    }
}

public class UpdateLocationSublocationsVisibilityCommand
{
    public UpdateLocationSublocationsVisibilityCommand(Guid locationInstanceId, UpdateLocationSublocationsVisibilityRequest request)
    {
        LocationInstanceId = locationInstanceId;
        Request = request;
    }

    public Guid LocationInstanceId { get; }
    public UpdateLocationSublocationsVisibilityRequest Request { get; }
}

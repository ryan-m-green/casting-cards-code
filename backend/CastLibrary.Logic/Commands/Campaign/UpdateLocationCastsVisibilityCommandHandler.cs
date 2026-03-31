using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateLocationCastsVisibilityCommandHandler
{
    Task HandleAsync(UpdateLocationCastsVisibilityCommand command);
}

public class UpdateLocationCastsVisibilityCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateLocationCastsVisibilityCommandHandler
{
    public async Task HandleAsync(UpdateLocationCastsVisibilityCommand command)
    {
        await campaignRepository.UpdateLocationCastsVisibilityAsync(command.LocationInstanceId, command.Request.IsVisibleToPlayers);
    }
}

public class UpdateLocationCastsVisibilityCommand
{
    public UpdateLocationCastsVisibilityCommand(Guid locationInstanceId, UpdateLocationCastsVisibilityRequest request)
    {
        LocationInstanceId = locationInstanceId;
        Request = request;
    }

    public Guid LocationInstanceId { get; }
    public UpdateLocationCastsVisibilityRequest Request { get; }
}

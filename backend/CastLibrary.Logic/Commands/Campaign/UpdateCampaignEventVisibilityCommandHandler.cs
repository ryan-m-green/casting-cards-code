using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCampaignEventVisibilityCommandHandler
{
    Task HandleAsync(UpdateCampaignEventVisibilityCommand command);
}

public class UpdateCampaignEventVisibilityCommandHandler(
    ICampaignEventUpdateRepository repository) : IUpdateCampaignEventVisibilityCommandHandler
{
    public Task HandleAsync(UpdateCampaignEventVisibilityCommand command)
        => repository.UpdateVisibilityAsync(command.EventId, command.Request.IsVisibleToPlayers);
}

public class UpdateCampaignEventVisibilityCommand
{
    public UpdateCampaignEventVisibilityCommand(Guid eventId, UpdateCampaignEventVisibilityRequest request)
    {
        EventId = eventId;
        Request = request;
    }

    public Guid EventId { get; }
    public UpdateCampaignEventVisibilityRequest Request { get; }
}

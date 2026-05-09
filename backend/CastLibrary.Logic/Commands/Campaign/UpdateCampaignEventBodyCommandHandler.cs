using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCampaignEventBodyCommandHandler
{
    Task HandleAsync(UpdateCampaignEventBodyCommand command);
}

public class UpdateCampaignEventBodyCommandHandler(
    ICampaignEventUpdateRepository repository) : IUpdateCampaignEventBodyCommandHandler
{
    public Task HandleAsync(UpdateCampaignEventBodyCommand command)
        => repository.UpdateBodyAsync(command.EventId, command.Request.Body);
}

public class UpdateCampaignEventBodyCommand
{
    public UpdateCampaignEventBodyCommand(Guid eventId, UpdateCampaignEventBodyRequest request)
    {
        EventId = eventId;
        Request = request;
    }

    public Guid EventId { get; }
    public UpdateCampaignEventBodyRequest Request { get; }
}

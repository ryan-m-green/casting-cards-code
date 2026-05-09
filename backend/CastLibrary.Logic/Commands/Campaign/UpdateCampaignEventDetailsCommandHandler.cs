using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCampaignEventDetailsCommandHandler
{
    Task HandleAsync(UpdateCampaignEventDetailsCommand command);
}

public class UpdateCampaignEventDetailsCommandHandler(
    ICampaignEventUpdateRepository repository) : IUpdateCampaignEventDetailsCommandHandler
{
    public Task HandleAsync(UpdateCampaignEventDetailsCommand command)
        => repository.UpdateDetailsAsync(
            command.EventId,
            command.Request.Title.Trim(),
            command.Request.Body,
            command.Request.LinkedEntityType,
            command.Request.LinkedEntityId);
}

public class UpdateCampaignEventDetailsCommand
{
    public UpdateCampaignEventDetailsCommand(Guid eventId, UpdateCampaignEventDetailsRequest request)
    {
        EventId = eventId;
        Request = request;
    }

    public Guid EventId { get; }
    public UpdateCampaignEventDetailsRequest Request { get; }
}

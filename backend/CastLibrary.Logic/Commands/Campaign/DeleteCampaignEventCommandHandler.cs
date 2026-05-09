using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteCampaignEventCommandHandler
{
    Task HandleAsync(DeleteCampaignEventCommand command);
}

public class DeleteCampaignEventCommandHandler(
    ICampaignEventDeleteRepository repository) : IDeleteCampaignEventCommandHandler
{
    public Task HandleAsync(DeleteCampaignEventCommand command)
        => repository.DeleteAsync(command.EventId);
}

public class DeleteCampaignEventCommand(Guid eventId)
{
    public Guid EventId { get; } = eventId;
}

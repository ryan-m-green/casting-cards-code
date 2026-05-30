using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IReorderCampaignEventsCommandHandler
{
    Task HandleAsync(ReorderCampaignEventsCommand command);
}

public class ReorderCampaignEventsCommandHandler(
    IStorylineUpdateRepository repository) : IReorderCampaignEventsCommandHandler
{
    public Task HandleAsync(ReorderCampaignEventsCommand command)
        => repository.ReorderAsync(command.Request.EventIds);
}

public class ReorderCampaignEventsCommand
{
    public ReorderCampaignEventsCommand(ReorderCampaignEventsRequest request)
    {
        Request = request;
    }

    public ReorderCampaignEventsRequest Request { get; }
}

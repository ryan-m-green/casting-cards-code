using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateStorylineArchiveMarkCommandHandler
{
    Task HandleAsync(UpdateStorylineArchiveMarkCommand command);
}

public class UpdateStorylineArchiveMarkCommandHandler(
    IStorylineUpdateRepository storylineUpdateRepository) : IUpdateStorylineArchiveMarkCommandHandler
{
    public async Task HandleAsync(UpdateStorylineArchiveMarkCommand command)
    {
        await storylineUpdateRepository.UpdateMarkedForArchiveAsync(command.EventId, command.MarkedForArchive);
    }
}

public class UpdateStorylineArchiveMarkCommand
{
    public UpdateStorylineArchiveMarkCommand(Guid eventId, bool markedForArchive)
    {
        EventId = eventId;
        MarkedForArchive = markedForArchive;
    }

    public Guid EventId { get; }
    public bool MarkedForArchive { get; }
}

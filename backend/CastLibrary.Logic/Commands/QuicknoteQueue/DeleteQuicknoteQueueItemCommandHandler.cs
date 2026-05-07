using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.QuicknoteQueue;

public interface IDeleteQuicknoteQueueItemCommandHandler
{
    Task HandleAsync(DeleteQuicknoteQueueItemCommand command);
}

public class DeleteQuicknoteQueueItemCommandHandler(
    IQuicknoteQueueDeleteRepository deleteRepository) : IDeleteQuicknoteQueueItemCommandHandler
{
    public Task HandleAsync(DeleteQuicknoteQueueItemCommand command)
        => deleteRepository.DeleteAsync(command.Id, command.PlayerUserId);
}

public class DeleteQuicknoteQueueItemCommand
{
    public DeleteQuicknoteQueueItemCommand(Guid id, Guid playerUserId)
    {
        Id           = id;
        PlayerUserId = playerUserId;
    }

    public Guid Id { get; }
    public Guid PlayerUserId { get; }
}

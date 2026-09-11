using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Ambiance;

public interface IDeleteAmbianceCommandHandler
{
    Task HandleAsync(DeleteAmbianceCommand command);
}

public class DeleteAmbianceCommandHandler(
    IAmbianceDeleteRepository deleteRepository) : IDeleteAmbianceCommandHandler
{
    public async Task HandleAsync(DeleteAmbianceCommand command)
    {
        await deleteRepository.DeleteAsync(command.AmbianceId);
    }
}

public class DeleteAmbianceCommand
{
    public DeleteAmbianceCommand(Guid ambianceId)
    {
        AmbianceId = ambianceId;
    }

    public Guid AmbianceId { get; }
}

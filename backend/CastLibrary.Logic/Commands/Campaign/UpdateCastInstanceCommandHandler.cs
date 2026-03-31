using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCastInstanceCommandHandler
{
    Task HandleAsync(UpdateCastInstanceCommand command);
}
public class UpdateCastInstanceCommandHandler : IUpdateCastInstanceCommandHandler
{
    public Task HandleAsync(UpdateCastInstanceCommand command) => Task.CompletedTask;
}

public class UpdateCastInstanceCommand
{
    public UpdateCastInstanceCommand(Guid instanceId, UpdateCastInstanceRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateCastInstanceRequest Request { get; }
}

using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteCastInstanceCommandHandler
{
    Task HandleAsync(DeleteCastInstanceCommand command);
}
public class DeleteCastInstanceCommandHandler(ICampaignDeleteRepository campaignRepository) : IDeleteCastInstanceCommandHandler
{
    public Task HandleAsync(DeleteCastInstanceCommand command) =>
        campaignRepository.DeleteCastInstanceAsync(command.InstanceId);
}

public class DeleteCastInstanceCommand
{
    public DeleteCastInstanceCommand(Guid instanceId)
    {
        InstanceId = instanceId;
    }
    public Guid InstanceId { get; }
}

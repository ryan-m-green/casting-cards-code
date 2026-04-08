using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteLocationInstanceCommandHandler
{
    Task HandleAsync(DeleteLocationInstanceCommand command);
}
public class DeleteLocationInstanceCommandHandler(ICampaignDeleteRepository campaignRepository) : IDeleteLocationInstanceCommandHandler
{
    public Task HandleAsync(DeleteLocationInstanceCommand command) =>
        campaignRepository.DeleteLocationInstanceAsync(command.InstanceId);
}

public class DeleteLocationInstanceCommand
{
    public DeleteLocationInstanceCommand(Guid instanceId)
    {
        InstanceId = instanceId;
    }
    public Guid InstanceId { get; }
}

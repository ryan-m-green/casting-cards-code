using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteCityInstanceCommandHandler
{
    Task HandleAsync(DeleteCityInstanceCommand command);
}
public class DeleteCityInstanceCommandHandler(ICampaignDeleteRepository campaignRepository) : IDeleteCityInstanceCommandHandler
{
    public Task HandleAsync(DeleteCityInstanceCommand command) =>
        campaignRepository.DeleteCityInstanceAsync(command.InstanceId);
}

public class DeleteCityInstanceCommand
{
    public DeleteCityInstanceCommand(Guid instanceId)
    {
        InstanceId = instanceId;
    }
    public Guid InstanceId { get; }
}

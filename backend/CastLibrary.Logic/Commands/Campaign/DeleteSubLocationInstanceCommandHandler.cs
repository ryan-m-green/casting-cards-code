using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteSublocationInstanceCommandHandler
{
    Task HandleAsync(DeleteSublocationInstanceCommand command);
}
public class DeleteSublocationInstanceCommandHandler(
    ICampaignDeleteRepository campaignRepository) : IDeleteSublocationInstanceCommandHandler
{
    public async Task HandleAsync(DeleteSublocationInstanceCommand command)
    {
        await campaignRepository.DeleteSublocationInstanceAsync(command.InstanceId);
    }
}

public class DeleteSublocationInstanceCommand
{
    public DeleteSublocationInstanceCommand(Guid instanceId)
    {
        InstanceId = instanceId;
    }
    public Guid InstanceId { get; }
}

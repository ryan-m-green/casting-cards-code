using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateSublocationInstanceCommandHandler
{
    Task HandleAsync(UpdateSublocationInstanceCommand command);
}

public class UpdateSublocationInstanceCommandHandler(
    ICampaignReadRepository campaignReadRepository,
    ICampaignUpdateRepository campaignUpdateRepository) : IUpdateSublocationInstanceCommandHandler
{
    public async Task HandleAsync(UpdateSublocationInstanceCommand command)
    {
        var instance = await campaignReadRepository.GetSublocationInstanceByIdAsync(command.InstanceId);
        if (instance is null) return;

        instance.Description = command.Request.Description;
        instance.DmNotes     = command.Request.DmNotes;

        await campaignUpdateRepository.UpdateSublocationInstanceAsync(instance);
    }
}

public class UpdateSublocationInstanceCommand
{
    public UpdateSublocationInstanceCommand(Guid instanceId, UpdateSublocationInstanceRequest request)
    {
        InstanceId = instanceId;
        Request    = request;
    }

    public Guid InstanceId { get; }
    public UpdateSublocationInstanceRequest Request { get; }
}

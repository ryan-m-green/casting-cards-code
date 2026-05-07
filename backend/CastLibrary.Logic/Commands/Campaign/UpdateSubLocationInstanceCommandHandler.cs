using CastLibrary.Logic.Commands.Sublocation;
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
    ICampaignUpdateRepository campaignUpdateRepository,
    IUpdateSublocationCommandHandler updateSublocationHandler) : IUpdateSublocationInstanceCommandHandler
{
    public async Task HandleAsync(UpdateSublocationInstanceCommand command)
    {
        var instance = await campaignReadRepository.GetSublocationInstanceByIdAsync(command.InstanceId);
        if (instance is null) return;

        instance.Name        = command.Request.Name;
        instance.Description = command.Request.Description;
        instance.DmNotes     = command.Request.DmNotes;

        await campaignUpdateRepository.UpdateSublocationInstanceAsync(instance);

        if (command.Request.SyncLibrary)
        {
            var libraryRequest = new CreateSublocationRequest
            {
                Name        = command.Request.Name,
                Description = command.Request.Description,
                ShopItems   = [],
            };
            await updateSublocationHandler.HandleAsync(
                new UpdateSublocationCommand(instance.SourceSublocationId, libraryRequest, command.DmUserId));
        }
    }
}

public class UpdateSublocationInstanceCommand
{
    public UpdateSublocationInstanceCommand(Guid instanceId, UpdateSublocationInstanceRequest request, Guid dmUserId)
    {
        InstanceId = instanceId;
        Request    = request;
        DmUserId   = dmUserId;
    }

    public Guid InstanceId { get; }
    public UpdateSublocationInstanceRequest Request { get; }
    public Guid DmUserId { get; }
}

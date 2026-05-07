using CastLibrary.Logic.Commands.Faction;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateFactionInstanceCommandHandler
{
    Task HandleAsync(UpdateFactionInstanceCommand command);
}

public class UpdateFactionInstanceCommandHandler(
    ICampaignReadRepository campaignReadRepository,
    ICampaignUpdateRepository campaignUpdateRepository,
    IUpdateFactionCommandHandler updateFactionHandler) : IUpdateFactionInstanceCommandHandler
{
    public async Task HandleAsync(UpdateFactionInstanceCommand command)
    {
        var instance = await campaignReadRepository.GetFactionInstanceByIdAsync(command.InstanceId);
        if (instance is null) return;

        instance.Name        = command.Request.Name;
        instance.Type        = command.Request.Type;
        instance.Description = command.Request.Description;
        instance.Hidden      = command.Request.Hidden;
        instance.DmNotes     = command.Request.DmNotes;
        instance.Influence   = command.Request.Influence;
        instance.Perception  = command.Request.Perception;

        await campaignUpdateRepository.UpdateFactionInstanceAsync(instance);

        if (command.Request.SyncLibrary)
        {
            var libraryRequest = new CreateFactionRequest
            {
                Name        = command.Request.Name,
                Type        = command.Request.Type,
                Description = command.Request.Description,
                Hidden      = command.Request.Hidden,
            };
            await updateFactionHandler.HandleAsync(
                new UpdateFactionCommand(instance.SourceFactionId, command.DmUserId, libraryRequest));
        }
    }
}

public class UpdateFactionInstanceCommand
{
    public UpdateFactionInstanceCommand(Guid instanceId, Guid dmUserId, UpdateFactionInstanceRequest request)
    {
        InstanceId = instanceId;
        DmUserId   = dmUserId;
        Request    = request;
    }

    public Guid InstanceId { get; }
    public Guid DmUserId   { get; }
    public UpdateFactionInstanceRequest Request { get; }
}

using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCastInstanceCommandHandler
{
    Task HandleAsync(UpdateCastInstanceCommand command);
}

public class UpdateCastInstanceCommandHandler(
    ICampaignReadRepository campaignReadRepository,
    ICampaignUpdateRepository campaignUpdateRepository,
    IUpdateCastCommandHandler updateCastHandler) : IUpdateCastInstanceCommandHandler
{
    public async Task HandleAsync(UpdateCastInstanceCommand command)
    {
        var instance = await campaignReadRepository.GetCastInstanceByIdAsync(command.InstanceId);
        if (instance is null) return;

        instance.Name              = command.Request.Name;
        instance.PublicDescription = command.Request.PublicDescription;
        instance.Description       = command.Request.Description;
        instance.Pronouns          = command.Request.Pronouns;
        instance.Race              = command.Request.Race;
        instance.Role              = command.Request.Role;
        instance.Age               = command.Request.Age;
        instance.Alignment         = command.Request.Alignment;
        instance.Posture           = command.Request.Posture;
        instance.Speed             = command.Request.Speed;
        instance.VoicePlacement    = command.Request.VoicePlacement;
        instance.DmNotes           = command.Request.DmNotes;

        await campaignUpdateRepository.UpdateCastInstanceAsync(instance);

        if (command.Request.SyncLibrary)
        {
            var libraryRequest = new CreateCastRequest
            {
                Name              = command.Request.Name,
                PublicDescription = command.Request.PublicDescription,
                Description       = command.Request.Description,
                Pronouns          = command.Request.Pronouns,
                Race              = command.Request.Race,
                Role              = command.Request.Role,
                Age               = command.Request.Age,
                Alignment         = command.Request.Alignment,
                Posture           = command.Request.Posture,
                Speed             = command.Request.Speed,
                VoicePlacement    = command.Request.VoicePlacement,
            };
            await updateCastHandler.HandleAsync(
                new UpdateCastCommand(instance.SourceCastId, libraryRequest, command.DmUserId));
        }
    }
}

public class UpdateCastInstanceCommand
{
    public UpdateCastInstanceCommand(Guid instanceId, UpdateCastInstanceRequest request, Guid dmUserId)
    {
        InstanceId = instanceId;
        Request    = request;
        DmUserId   = dmUserId;
    }

    public Guid InstanceId { get; }
    public UpdateCastInstanceRequest Request { get; }
    public Guid DmUserId { get; }
}

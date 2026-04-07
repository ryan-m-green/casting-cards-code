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
    ICampaignUpdateRepository campaignUpdateRepository) : IUpdateCastInstanceCommandHandler
{
    public async Task HandleAsync(UpdateCastInstanceCommand command)
    {
        var instance = await campaignReadRepository.GetCastInstanceByIdAsync(command.InstanceId);
        if (instance is null) return;
        instance.PublicDescription = command.Request.PublicDescription;
        instance.Description       = command.Request.Description;
        instance.Pronouns          = command.Request.Pronouns;
        instance.Race              = command.Request.Race;
        instance.Role              = command.Request.Role;
        instance.Age               = command.Request.Age;
        instance.Alignment         = command.Request.Alignment;
        instance.Posture           = command.Request.Posture;
        instance.Speed             = command.Request.Speed;
        instance.DmNotes           = command.Request.DmNotes;
        await campaignUpdateRepository.UpdateCastInstanceAsync(instance);
    }
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

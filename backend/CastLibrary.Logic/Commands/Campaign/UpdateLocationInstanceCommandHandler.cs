using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateLocationInstanceCommandHandler
{
    Task HandleAsync(UpdateLocationInstanceCommand command);
}
public class UpdateLocationInstanceCommandHandler(ICampaignReadRepository campaignReadRepository, ICampaignUpdateRepository campaignUpdateRepository) : IUpdateLocationInstanceCommandHandler
{
    public async Task HandleAsync(UpdateLocationInstanceCommand command)
    {
        var instance = await campaignReadRepository.GetLocationInstanceByIdAsync(command.InstanceId);
        if (instance is null) return;

        instance.Description    = command.Request.Description;
        instance.Classification = command.Request.Classification;
        instance.Size           = command.Request.Size;
        instance.Condition      = command.Request.Condition;
        instance.Geography      = command.Request.Geography;
        instance.Architecture   = command.Request.Architecture;
        instance.Climate        = command.Request.Climate;
        instance.Religion       = command.Request.Religion;
        instance.Vibe           = command.Request.Vibe;
        instance.Languages      = command.Request.Languages;
        instance.DmNotes        = command.Request.DmNotes;

        await campaignUpdateRepository.UpdateLocationInstanceAsync(instance);
    }
}

public class UpdateLocationInstanceCommand
{
    public UpdateLocationInstanceCommand(Guid instanceId, UpdateLocationInstanceRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateLocationInstanceRequest Request { get; }
}

using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCityInstanceCommandHandler
{
    Task HandleAsync(UpdateCityInstanceCommand command);
}
public class UpdateCityInstanceCommandHandler(ICampaignReadRepository campaignReadRepository, ICampaignUpdateRepository campaignUpdateRepository) : IUpdateCityInstanceCommandHandler
{
    public async Task HandleAsync(UpdateCityInstanceCommand command)
    {
        var instance = await campaignReadRepository.GetCityInstanceByIdAsync(command.InstanceId);
        if (instance is null) return;

        instance.Condition = command.Request.Condition;
        instance.Geography = command.Request.Geography;
        instance.Climate   = command.Request.Climate;
        instance.Religion  = command.Request.Religion;
        instance.Vibe      = command.Request.Vibe;
        instance.Languages = command.Request.Languages;

        await campaignUpdateRepository.UpdateCityInstanceAsync(instance);
    }
}

public class UpdateCityInstanceCommand
{
    public UpdateCityInstanceCommand(Guid instanceId, UpdateCityInstanceRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateCityInstanceRequest Request { get; }
}

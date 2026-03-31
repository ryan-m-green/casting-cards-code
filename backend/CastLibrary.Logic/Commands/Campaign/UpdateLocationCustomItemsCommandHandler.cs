using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using System.Text.Json;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateLocationCustomItemsCommandHandler
{
    Task HandleAsync(UpdateLocationCustomItemsCommand command);
}
public class UpdateLocationCustomItemsCommandHandler(ICampaignUpdateRepository campaignRepository) : IUpdateLocationCustomItemsCommandHandler
{
    public async Task HandleAsync(UpdateLocationCustomItemsCommand command)
    {
        var items = command.Request.Items.Select(i => new CampaignCastCustomItemDomain(i.Name, i.Price)).ToList();
        var json  = JsonSerializer.Serialize(items);
        await campaignRepository.UpdateLocationCustomItemsAsync(command.InstanceId, json);
    }
}

public class UpdateLocationCustomItemsCommand
{
    public UpdateLocationCustomItemsCommand(Guid instanceId, UpdateCastCustomItemsRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateCastCustomItemsRequest Request { get; }
}

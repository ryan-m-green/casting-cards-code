using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using System.Text.Json;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCastCustomItemsCommandHandler
{
    Task HandleAsync(UpdateCastCustomItemsCommand command);
}
public class UpdateCastCustomItemsCommandHandler(ICampaignUpdateRepository campaignRepository) : IUpdateCastCustomItemsCommandHandler
{
    public async Task HandleAsync(UpdateCastCustomItemsCommand command)
    {
        var items = command.Request.Items.Select(i => new CampaignCastCustomItemDomain(i.Name, i.Price)).ToList();
        var json  = JsonSerializer.Serialize(items);
        await campaignRepository.UpdateCastCustomItemsAsync(command.InstanceId, json);
    }
}

public class UpdateCastCustomItemsCommand
{
    public UpdateCastCustomItemsCommand(Guid instanceId, UpdateCastCustomItemsRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateCastCustomItemsRequest Request { get; }
}

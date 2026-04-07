using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using System.Text.Json;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateSublocationCustomItemsCommandHandler
{
    Task HandleAsync(UpdateSublocationCustomItemsCommand command);
}
public class UpdateSublocationCustomItemsCommandHandler(ICampaignUpdateRepository campaignRepository) : IUpdateSublocationCustomItemsCommandHandler
{
    public async Task HandleAsync(UpdateSublocationCustomItemsCommand command)
    {
        var items = command.Request.Items.Select(i => new CampaignCastCustomItemDomain(i.Name, i.Price)).ToList();
        var json  = JsonSerializer.Serialize(items);
        await campaignRepository.UpdateSublocationCustomItemsAsync(command.InstanceId, json);
    }
}

public class UpdateSublocationCustomItemsCommand
{
    public UpdateSublocationCustomItemsCommand(Guid instanceId, UpdateCastCustomItemsRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateCastCustomItemsRequest Request { get; }
}

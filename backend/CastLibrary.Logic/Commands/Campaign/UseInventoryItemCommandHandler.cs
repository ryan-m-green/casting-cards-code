using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUseInventoryItemCommandHandler
{
    Task<bool> HandleAsync(UseInventoryItemCommand command);
}

public class UseInventoryItemCommandHandler(
    IPlayerCampaignInventoryReadRepository playerCampaignInventoryReadRepository,
    IPlayerCampaignInventoryUpdateRepository playerCampaignInventoryUpdateRepository) : IUseInventoryItemCommandHandler
{
    public async Task<bool> HandleAsync(UseInventoryItemCommand command)
    {
        try
        {
            var inventoryItem = await playerCampaignInventoryReadRepository.GetByIdAsync(command.InventoryItemId);

            if (inventoryItem.CampaignId != command.CampaignId || inventoryItem.PlayerUserId != command.PlayerUserId)
                return false;

            if (inventoryItem.Count > 1)
            {
                await playerCampaignInventoryUpdateRepository.DecrementCountAsync(inventoryItem.Id);
            }
            else
            {
                await playerCampaignInventoryUpdateRepository.DeleteAsync(inventoryItem.Id);
            }

            return true;
        }
        catch (InvalidOperationException)
        {
            return false;
        }
    }
}

public class UseInventoryItemCommand
{
    public UseInventoryItemCommand(Guid campaignId, Guid playerUserId, UseInventoryItemRequest request)
    {
        CampaignId = campaignId;
        PlayerUserId = playerUserId;
        Request = request;
    }

    public Guid CampaignId { get; }
    public Guid PlayerUserId { get; }
    public UseInventoryItemRequest Request { get; }

    public Guid InventoryItemId => Request.InventoryItemId;
}

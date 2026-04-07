using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IToggleShopItemScratchCommandHandler
{
    Task HandleAsync(ToggleShopItemScratchCommand command);
}

public class ToggleShopItemScratchCommandHandler(
    ICampaignReadRepository campaignReadRepository,
    ICampaignUpdateRepository campaignUpdateRepository) : IToggleShopItemScratchCommandHandler
{
    public async Task HandleAsync(ToggleShopItemScratchCommand command)
    {
        var instances = await campaignReadRepository.GetSublocationInstancesByCampaignAsync(command.CampaignId);
        var item = instances
            .SelectMany(i => i.ShopItems)
            .FirstOrDefault(s => s.Id == command.ShopItemId);

        if (item is null) return;

        await campaignUpdateRepository.ToggleShopItemScratchAsync(command.ShopItemId, !item.IsScratchedOff);
    }
}

public class ToggleShopItemScratchCommand
{
    public ToggleShopItemScratchCommand(Guid campaignId, Guid shopItemId)
    {
        CampaignId = campaignId;
        ShopItemId = shopItemId;
    }

    public Guid CampaignId { get; }
    public Guid ShopItemId { get; }
}

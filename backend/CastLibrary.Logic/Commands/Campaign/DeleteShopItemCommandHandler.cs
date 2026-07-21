using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteShopItemCommandHandler
{
    Task HandleAsync(DeleteShopItemCommand command);
}

public class DeleteShopItemCommandHandler(
    ICampaignReadRepository campaignReadRepository,
    ICampaignUpdateRepository campaignUpdateRepository) : IDeleteShopItemCommandHandler
{
    public async Task HandleAsync(DeleteShopItemCommand command)
    {
        var instances = await campaignReadRepository.GetSublocationInstancesByCampaignAsync(command.CampaignId);
        var item = instances
            .SelectMany(i => i.ShopItems)
            .FirstOrDefault(s => s.Id == command.ShopItemId);

        if (item is null) return;

        await campaignUpdateRepository.DeleteShopItemAsync(command.ShopItemId);
    }
}

public class DeleteShopItemCommand
{
    public DeleteShopItemCommand(Guid campaignId, Guid shopItemId)
    {
        CampaignId = campaignId;
        ShopItemId = shopItemId;
    }

    public Guid CampaignId { get; }
    public Guid ShopItemId { get; }
}

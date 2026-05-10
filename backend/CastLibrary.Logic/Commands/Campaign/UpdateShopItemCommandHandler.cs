using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateShopItemCommandHandler
{
    Task HandleAsync(UpdateShopItemCommand command);
}

public class UpdateShopItemCommandHandler(
    ICampaignUpdateRepository campaignUpdateRepository) : IUpdateShopItemCommandHandler
{
    public async Task HandleAsync(UpdateShopItemCommand command)
    {
        await campaignUpdateRepository.UpdateShopItemAsync(
            command.ShopItemId,
            command.Name,
            command.PriceAmount,
            command.PriceCurrencyType);
    }
}

public class UpdateShopItemCommand
{
    public UpdateShopItemCommand(Guid shopItemId, string name, int priceAmount, string priceCurrencyType)
    {
        ShopItemId        = shopItemId;
        Name              = name;
        PriceAmount       = priceAmount;
        PriceCurrencyType = priceCurrencyType;
    }

    public Guid   ShopItemId        { get; }
    public string Name              { get; }
    public int    PriceAmount       { get; }
    public string PriceCurrencyType { get; }
}

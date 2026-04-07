using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddLocationShopItemCommandHandler
{
    Task<ShopItemDomain> HandleAsync(AddLocationShopItemCommand command);
}

public class AddLocationShopItemCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : IAddLocationShopItemCommandHandler
{
    public async Task<ShopItemDomain> HandleAsync(AddLocationShopItemCommand command)
    {
        var item = new ShopItemDomain
        {
            Name        = command.Request.Name,
            Price       = command.Request.Price,
            Description = command.Request.Description,
            SortOrder   = 0,
        };

        return await campaignInsertRepository.InsertLocationShopItemAsync(command.LocationInstanceId, item);
    }
}

public class AddLocationShopItemCommand
{
    public AddLocationShopItemCommand(Guid locationInstanceId, AddLocationShopItemRequest request)
    {
        LocationInstanceId = locationInstanceId;
        Request            = request;
    }

    public Guid LocationInstanceId { get; }
    public AddLocationShopItemRequest Request { get; }
}

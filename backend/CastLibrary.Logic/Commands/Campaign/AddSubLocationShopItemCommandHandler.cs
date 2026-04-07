using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddSublocationShopItemCommandHandler
{
    Task<ShopItemDomain> HandleAsync(AddSublocationShopItemCommand command);
}

public class AddSublocationShopItemCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : IAddSublocationShopItemCommandHandler
{
    public async Task<ShopItemDomain> HandleAsync(AddSublocationShopItemCommand command)
    {
        var item = new ShopItemDomain
        {
            Name        = command.Request.Name,
            Price       = command.Request.Price,
            Description = command.Request.Description,
            SortOrder   = 0,
        };

        return await campaignInsertRepository.InsertSublocationShopItemAsync(command.SublocationInstanceId, item);
    }
}

public class AddSublocationShopItemCommand
{
    public AddSublocationShopItemCommand(Guid sublocationInstanceId, AddSublocationShopItemRequest request)
    {
        SublocationInstanceId = sublocationInstanceId;
        Request               = request;
    }

    public Guid SublocationInstanceId { get; }
    public AddSublocationShopItemRequest Request { get; }
}

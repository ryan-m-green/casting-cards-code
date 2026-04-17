using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.PlayerCard;

public interface IGetPlayerCardQueryHandler
{
    Task<PlayerCardDomain?> HandleAsync(Guid campaignId, Guid playerUserId);
}

public class GetPlayerCardQueryHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    ICurrencyBalanceReadRepository currencyBalanceReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetPlayerCardQueryHandler
{
    public async Task<PlayerCardDomain?> HandleAsync(Guid campaignId, Guid playerUserId)
    {
        var card = await playerCardReadRepository.GetByCampaignAndPlayerAsync(campaignId, playerUserId);
        if (card is null) return null;

        var key = imageKeyCreator.Create(card.PlayerUserId, card.Id, EntityType.PlayerCard);
        card.ImageUrl = imageStorageOperator.GetPublicUrl(key);
        card.CurrencyBalances = await currencyBalanceReadRepository.GetByPlayerAsync(campaignId, playerUserId);
        return card;
    }
}

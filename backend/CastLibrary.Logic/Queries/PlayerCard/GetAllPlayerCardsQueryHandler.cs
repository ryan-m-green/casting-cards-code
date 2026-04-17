using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.PlayerCard;

public interface IGetAllPlayerCardsQueryHandler
{
    Task<List<PlayerCardDomain>> HandleAsync(Guid campaignId);
}

public class GetAllPlayerCardsQueryHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    ICurrencyBalanceReadRepository currencyBalanceReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetAllPlayerCardsQueryHandler
{
    public async Task<List<PlayerCardDomain>> HandleAsync(Guid campaignId)
    {
        var cards = await playerCardReadRepository.GetByCampaignAsync(campaignId);
        var balances = await currencyBalanceReadRepository.GetByCampaignAsync(campaignId);

        foreach (var card in cards)
        {
            var key = imageKeyCreator.Create(card.PlayerUserId, card.Id, EntityType.PlayerCard);
            card.ImageUrl = imageStorageOperator.GetPublicUrl(key);
            card.CurrencyBalances = balances.TryGetValue(card.PlayerUserId, out var b) ? b : new();
        }
        return cards;
    }
}

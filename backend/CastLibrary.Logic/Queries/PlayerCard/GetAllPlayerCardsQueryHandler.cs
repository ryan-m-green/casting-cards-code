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
    ICampaignReadRepository campaignReadRepository,
    ICurrencyBalanceReadRepository currencyBalanceReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetAllPlayerCardsQueryHandler
{
    public async Task<List<PlayerCardDomain>> HandleAsync(Guid campaignId)
    {
        var cards = await playerCardReadRepository.GetByCampaignAsync(campaignId);
        var balances = await currencyBalanceReadRepository.GetByCampaignAsync(campaignId);
        var campaign = await campaignReadRepository.GetByIdAsync(campaignId);

        foreach (var card in cards)
        {
            var key = imageKeyCreator.Create(campaign.DmUserId, card.CampaignId, card.PlayerUserId, EntityType.PlayerCard);
            card.ImageUrl = imageStorageOperator.GetPublicUrl(key);
            card.CurrencyBalances = balances.TryGetValue(card.PlayerUserId, out var b) ? b : new();
        }
        return cards;
    }
}

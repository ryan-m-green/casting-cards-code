using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.PlayerCard;

public class PartyData
{
    public List<PlayerCardDomain> PartyCards { get; set; } = [];
    public List<CampaignCastInstanceDomain> QuestingCompanions { get; set; } = [];
    public Guid? PartyAnchorSublocationInstanceId { get; set; }
}

public interface IGetDiscoveredCastQueryHandler
{
    Task<PartyData> HandleAsync(Guid campaignId);
}

public class GetDiscoveredCastQueryHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    ICampaignReadRepository campaignReadRepository,
    ICurrencyBalanceReadRepository currencyBalanceReadRepository,
    IImageKeyCreator imageKeyCreator,
    IFilenameService filenameService,
    IImageStorageOperator imageStorageOperator) : IGetDiscoveredCastQueryHandler
{
    public async Task<PartyData> HandleAsync(Guid campaignId)
    {
        var cards    = await playerCardReadRepository.GetByCampaignAsync(campaignId);
        var balances = await currencyBalanceReadRepository.GetByCampaignAsync(campaignId);

        foreach (var card in cards)
        {
            var key = imageKeyCreator.Create(card.PlayerUserId, card.Id, EntityType.PlayerCard);
            card.ImageUrl = imageStorageOperator.GetPublicUrl(key);
            card.CurrencyBalances = balances.TryGetValue(card.PlayerUserId, out var b) ? b : new();
        }

        var partySubLoc = await campaignReadRepository.GetPartySublocationInstanceByCampaignAsync(campaignId);
        if (partySubLoc is null)
            return new PartyData { PartyCards = cards };

        var companions = await campaignReadRepository.GetQuestingCompanionsBySublocationInstanceIdAsync(partySubLoc.InstanceId);

        if (companions.Count > 0)
        {
            var campaign = await campaignReadRepository.GetByIdAsync(campaignId);
            if (campaign is not null)
                filenameService.AddImageUrls(campaign.DmUserId, [], [], companions, []);
        }

        return new PartyData { PartyCards = cards, QuestingCompanions = companions, PartyAnchorSublocationInstanceId = partySubLoc.InstanceId };
    }
}

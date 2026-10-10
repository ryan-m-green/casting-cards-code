using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

/// <summary>Coin/treasure awards made to players.</summary>
public class CoinRewardChronicleArchiveStrategy(IChronicleMapper chronicleMapper) : IChronicleArchiveStrategy
{
    public bool Supports(ChronicleContentType contentType) => contentType == ChronicleContentType.CoinReward;

    public Task<CampaignChroniclesDomain> BuildAsync(Guid campaignId, CreateChronicleRequest request)
    {
        var title = string.IsNullOrWhiteSpace(request.Title) ? "Treasure Awarded" : request.Title.Trim();

        return Task.FromResult(new CampaignChroniclesDomain
        {
            ContentType = chronicleMapper.ToStorageValue(ChronicleContentType.CoinReward),
            SourceId = request.SourceId,
            Title = title,
            Body = request.Body,
            TodSliceName = request.TodSliceName,
            IsGmOnly = request.IsGmOnly ?? false,
            LinkedEntities = chronicleMapper.MapParticipants(request),
            PlayedOn = (request.PlayedOn ?? DateTime.UtcNow).Date,
            SessionNumber = request.SessionNumber
        });
    }
}

/// <summary>Items purchased by players through sublocation stores.</summary>
public class ShopPurchaseChronicleArchiveStrategy(IChronicleMapper chronicleMapper) : IChronicleArchiveStrategy
{
    public bool Supports(ChronicleContentType contentType) => contentType == ChronicleContentType.ShopPurchase;

    public Task<CampaignChroniclesDomain> BuildAsync(Guid campaignId, CreateChronicleRequest request)
    {
        var title = string.IsNullOrWhiteSpace(request.Title) ? "Item Purchased" : request.Title.Trim();

        return Task.FromResult(new CampaignChroniclesDomain
        {
            ContentType = chronicleMapper.ToStorageValue(ChronicleContentType.ShopPurchase),
            SourceId = request.SourceId,
            Title = title,
            Body = request.Body,
            TodSliceName = request.TodSliceName,
            IsGmOnly = request.IsGmOnly ?? false,
            LinkedEntities = chronicleMapper.MapParticipants(request),
            PlayedOn = (request.PlayedOn ?? DateTime.UtcNow).Date,
            SessionNumber = request.SessionNumber
        });
    }
}


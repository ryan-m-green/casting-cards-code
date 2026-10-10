using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using ChronicleLinkedEntity = CastLibrary.Shared.Domain.LinkedEntityTrigger;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

/// <summary>
/// Maps chronicle content types and request participants into values/entities used
/// by the v2 chronicle archive strategies.
/// </summary>
public interface IChronicleMapper
{
    string ToStorageValue(ChronicleContentType type);

    string ToLabel(ChronicleContentType type);

    ChronicleContentType FromStorageValue(string value);

    List<ChronicleLinkedEntity> MapParticipants(CreateChronicleRequest request);
}

public class ChronicleMapper : IChronicleMapper
{
    private const string Scene = "scene";
    private const string Handout = "handout";
    private const string PlayerNote = "player-note";
    private const string Secret = "secret";
    private const string CoinReward = "coin-reward";
    private const string ShopPurchase = "shop-purchase";
    private const string Encounter = "encounter";
    private const string TimePassed = "time-passed";

    public string ToStorageValue(ChronicleContentType type) => type switch
    {
        ChronicleContentType.Scene => Scene,
        ChronicleContentType.Handout => Handout,
        ChronicleContentType.PlayerNote => PlayerNote,
        ChronicleContentType.Secret => Secret,
        ChronicleContentType.CoinReward => CoinReward,
        ChronicleContentType.ShopPurchase => ShopPurchase,
        ChronicleContentType.Encounter => Encounter,
        ChronicleContentType.TimePassed => TimePassed,
        _ => throw new ArgumentOutOfRangeException(nameof(type))
    };

    public string ToLabel(ChronicleContentType type) => type switch
    {
        ChronicleContentType.Scene => "Scene",
        ChronicleContentType.Handout => "Handout",
        ChronicleContentType.PlayerNote => "Player Note",
        ChronicleContentType.Secret => "Secret",
        ChronicleContentType.CoinReward => "Treasure",
        ChronicleContentType.ShopPurchase => "Purchase",
        ChronicleContentType.Encounter => "Encounter",
        ChronicleContentType.TimePassed => "Time",
        _ => type.ToString()
    };

    public ChronicleContentType FromStorageValue(string value) => value switch
    {
        Scene => ChronicleContentType.Scene,
        Handout => ChronicleContentType.Handout,
        PlayerNote => ChronicleContentType.PlayerNote,
        Secret => ChronicleContentType.Secret,
        CoinReward => ChronicleContentType.CoinReward,
        ShopPurchase => ChronicleContentType.ShopPurchase,
        Encounter => ChronicleContentType.Encounter,
        TimePassed => ChronicleContentType.TimePassed,
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public List<ChronicleLinkedEntity> MapParticipants(CreateChronicleRequest request)
    {
        return request.Participants
            .Select(p => new ChronicleLinkedEntity
            {
                EntityType = p.EntityType,
                EntityId = p.EntityId,
                EntityName = p.EntityName,
                EntityRole = p.EntityRole,
                EntityRace = p.EntityRace,
                EntityImageUrl = p.EntityImageUrl,
                EntityState = p.EntityState,
                EntityCount = p.EntityCount
            })
            .ToList();
    }
}

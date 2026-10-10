using System.Text.Json.Serialization;

namespace CastLibrary.Shared.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ChronicleContentType
{
    Scene,
    Handout,
    PlayerNote,
    Secret,
    CoinReward,
    ShopPurchase
}


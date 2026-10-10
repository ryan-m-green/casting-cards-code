using System.Text.Json.Serialization;

namespace CastLibrary.Shared.Domain;

public class LinkedEntityTrigger
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;

    /// <summary>
    /// Card face carried by a participant that is a simple card rather than a bare name. The encounter
    /// archive fills these so a fight's cast cards can be drawn from the entry itself; a plain linked
    /// card leaves them empty.
    /// </summary>
    public string EntityRole { get; set; } = string.Empty;

    public string EntityRace { get; set; } = string.Empty;

    public string EntityImageUrl { get; set; } = string.Empty;

    /// <summary>
    /// How the card finished the fight it was linked from: "defeated", "captured", "escaped", or
    /// empty when it was left standing. Empty for entities that carry no encounter outcome.
    /// </summary>
    public string EntityState { get; set; } = string.Empty;

    /// <summary>
    /// How many copies of the card the fight held (1 for a card that stood in it alone, 0 for an
    /// entity the count does not apply to).
    /// </summary>
    public int EntityCount { get; set; }

    public decimal? TodPositionPercent { get; set; }
    public string originalEntityType { get; set; } = string.Empty;
    [JsonPropertyName("visibleToPlayers")]
    public bool VisibleToPlayers { get; set; }
    
    // Card movement data wrapper
    public CardMovementData CardMovement { get; set; } = new CardMovementData();
}

public class CardMovementData
{
    [JsonPropertyName("locationInstanceId")]
    public Guid? LocationInstanceId { get; set; }

    [JsonPropertyName("fromInstanceId")]
    public Guid? FromInstanceId { get; set; }

    [JsonPropertyName("toInstanceId")]
    public Guid? ToInstanceId { get; set; }

    [JsonPropertyName("fromSublocationName")]
    public string FromSublocationName { get; set; } = string.Empty;

    [JsonPropertyName("toSublocationName")]
    public string ToSublocationName { get; set; } = string.Empty;
}

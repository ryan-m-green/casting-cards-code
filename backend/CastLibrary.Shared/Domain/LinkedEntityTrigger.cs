using System.Text.Json.Serialization;

namespace CastLibrary.Shared.Domain;

public class LinkedEntityTrigger
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
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

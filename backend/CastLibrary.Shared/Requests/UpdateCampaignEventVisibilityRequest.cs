using System.Text.Json.Serialization;

namespace CastLibrary.Shared.Requests;

public class UpdateCampaignEventVisibilityRequest
{
    public List<EntityVisibility> EntityVisibilities { get; set; } = new();
}

public class EntityVisibility
{
    [JsonPropertyName("entityType")]
    public string EntityType { get; set; } = string.Empty;

    [JsonPropertyName("entityId")]
    public Guid EntityId { get; set; }

    [JsonPropertyName("todPositionPercent")]
    public decimal? TodPositionPercent { get; set; }

    [JsonPropertyName("isVisible")]
    public bool IsVisible { get; set; }
}

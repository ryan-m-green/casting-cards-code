namespace CastLibrary.Shared.Requests;

public class UpdateCampaignEventVisibilityRequest
{
    public List<EntityVisibility> EntityVisibilities { get; set; } = new();
}

public class EntityVisibility
{
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public decimal? TodPositionPercent { get; set; }
    public bool IsVisible { get; set; }
}

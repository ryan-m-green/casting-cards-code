namespace CastLibrary.Shared.Domain;

public class CampaignEventDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public Guid? LinkedEntityId { get; set; }
    public string LinkedEntityType { get; set; }
    public string FilePath { get; set; }
    public string ImageUrl { get; set; }
    public decimal? TodPositionPercent { get; set; }
    public bool VisibleToPlayers { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

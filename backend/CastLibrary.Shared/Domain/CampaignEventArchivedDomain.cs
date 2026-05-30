namespace CastLibrary.Shared.Domain;

public class CampaignEventArchivedDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<LinkedEntityTrigger> LinkedEntities { get; set; } = [];
    public string FilePath { get; set; }
    public string ImageUrl { get; set; }
    public string TodSliceName { get; set; }
    public int InGameDay { get; set; }
    public bool VisibleToPlayers { get; set; }
    public DateTime ArchivedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

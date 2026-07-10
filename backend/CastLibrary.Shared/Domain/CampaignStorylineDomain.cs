namespace CastLibrary.Shared.Domain;

public class CampaignStorylineDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<LinkedEntityTrigger> LinkedEntities { get; set; } = [];
    public string FilePath { get; set; }
    public string ImageUrl { get; set; }
    public bool VisibleToPlayers { get; set; }
    public bool MarkedForArchive { get; set; }
    public string SceneType { get; set; } = "campaign-event";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

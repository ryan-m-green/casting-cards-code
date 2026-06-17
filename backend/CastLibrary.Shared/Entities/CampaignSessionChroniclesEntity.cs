namespace CastLibrary.Shared.Entities;

public class CampaignSessionChroniclesEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string LinkedEntities { get; set; } = "[]";
    public string FilePath { get; set; }
    public string TodSliceName { get; set; }
    public DateTime ArchivedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string Keywords { get; set; } = string.Empty;
}

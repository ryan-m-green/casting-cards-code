namespace CastLibrary.Shared.Responses;

public class CampaignNoteResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid InstanceId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string CreatedByDisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

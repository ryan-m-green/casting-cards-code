namespace CastLibrary.Shared.Entities;

public class CampaignSublocationPlayerNotesEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid SublocationInstanceId { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

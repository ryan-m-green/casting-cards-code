namespace CastLibrary.Shared.Entities;

public class CampaignLocationPlayerNotesEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid LocationInstanceId { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

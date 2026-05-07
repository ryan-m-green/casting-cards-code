namespace CastLibrary.Shared.Entities;

public class CampaignFactionPlayerNotesEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid FactionInstanceId { get; set; }
    public string? Notes { get; set; }
    public short? Influence { get; set; }
    public short? Perception { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

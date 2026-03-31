namespace CastLibrary.Shared.Entities;

public class CampaignCastPlayerNotesEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid CastInstanceId { get; set; }
    public string Want { get; set; } = string.Empty;
    public string[] Connections { get; set; } = [];
    public string Alignment { get; set; } = string.Empty;
    public short Perception { get; set; }
    public short Rating { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

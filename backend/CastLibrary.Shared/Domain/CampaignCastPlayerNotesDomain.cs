namespace CastLibrary.Shared.Domain;

public class CampaignCastPlayerNotesDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid CastInstanceId { get; set; }
    public string Want { get; set; } = string.Empty;
    public List<Guid> Connections { get; set; } = [];
    public string Alignment { get; set; } = string.Empty;
    public int Perception { get; set; }
    public int Rating { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

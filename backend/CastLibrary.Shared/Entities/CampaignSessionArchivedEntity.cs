namespace CastLibrary.Shared.Entities;

public class CampaignSessionArchivedEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public int SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AlternateTitle { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int[] InGameDays { get; set; } = Array.Empty<int>();
    public DateTime ArchivedAt { get; set; }
}

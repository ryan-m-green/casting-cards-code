namespace CastLibrary.Shared.Entities;

public class SessionEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public int SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AlternateTitle { get; set; }
    public DateTime StartTime { get; set; }
    public int StartInGameDay { get; set; }
    public bool IsActive { get; set; }
}

namespace CastLibrary.Shared.Responses;

public class SessionResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public int SessionNumber { get; set; }
    public DateTime StartTime { get; set; }
    public int StartInGameDay { get; set; }
    public bool IsActive { get; set; }
}

public class ArchivedSessionResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public int SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AlternateTitle { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int[] InGameDays { get; set; } = Array.Empty<int>();
    public DateTime ArchivedAt { get; set; }
}

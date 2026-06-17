namespace CastLibrary.Shared.Responses;

public class SessionRowEntity
{
    public Guid SessionId { get; set; }
    public int SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AlternateTitle { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public int[] InGameDays { get; set; } = Array.Empty<int>();
    public int ChronicleCount { get; set; }
}

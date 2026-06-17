namespace CastLibrary.Shared.Responses;

public class ChroniclesRowEntity
{
    public Guid SessionId { get; set; }
    public int SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AlternateTitle { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public int[] InGameDays { get; set; } = Array.Empty<int>();
    public int ChronicleCount { get; set; }
    public Guid ChronicleId { get; set; }
    public string ChronicleTitle { get; set; } = string.Empty;
    public string ChronicleBody { get; set; } = string.Empty;
    public string LinkedEntities { get; set; } = string.Empty;
    public string FilePath { get; set; }
    public string TodSliceName { get; set; }
    public bool IsGmOnly { get; set; }
    public DateTime ArchivedAt { get; set; }
}

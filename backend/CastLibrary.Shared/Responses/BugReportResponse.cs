namespace CastLibrary.Shared.Responses;

public class BugReportResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? StepsToReproduce { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? PageUrl { get; set; }
    public string? Device { get; set; }
    public string? Browser { get; set; }
    public string? Os { get; set; }
    public string? ScreenResolution { get; set; }
    public bool IsFixed { get; set; }
    public DateTime? FixedAt { get; set; }
    public DateTime ReportedAt { get; set; }
    public string ReporterDisplayName { get; set; } = string.Empty;
}

namespace CastLibrary.Shared.Requests;

public class SubmitBugReportRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? StepsToReproduce { get; set; }
    public string Severity { get; set; } = "Medium";
    public string? PageUrl { get; set; }
    public string? Device { get; set; }
    public string? Browser { get; set; }
    public string? Os { get; set; }
    public string? ScreenResolution { get; set; }
}

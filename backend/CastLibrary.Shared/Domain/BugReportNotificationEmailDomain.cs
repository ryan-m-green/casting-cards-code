namespace CastLibrary.Shared.Domain;

public class BugReportNotificationEmailDomain : IEmailDomain
{
    public string ToEmail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string StepsToReproduce { get; set; } = string.Empty;
    public string Severity { get; set; }
    public string ReporterDisplayName { get; set; } = string.Empty;
    public string PageUrl { get; set; } = string.Empty;
    public string Device { get; set; } = string.Empty;
    public string Browser { get; set; } = string.Empty;
    public string Os { get; set; } = string.Empty;
    public string ScreenResolution { get; set; } = string.Empty;
    public DateTime ReportedAt { get; set; }
}

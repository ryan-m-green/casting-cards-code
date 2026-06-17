namespace CastLibrary.Shared.Domain;

public class InactivityReminderEmailDomain : IEmailDomain
{
    public string ToEmail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string LoginUrl { get; set; } = string.Empty;
}

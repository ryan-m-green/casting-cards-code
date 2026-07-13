namespace CastLibrary.Shared.Domain;

public class EmailChangeSecurityAlertEmailDomain : IEmailDomain
{
    public string ToEmail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string NewEmail { get; set; } = string.Empty;
    public string ChangedAt { get; set; } = string.Empty;
}

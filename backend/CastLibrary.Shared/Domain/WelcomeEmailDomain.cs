namespace CastLibrary.Shared.Domain;

public class WelcomeEmailDomain : IEmailDomain
{
    public string ToEmail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string LoginLink { get; set; } = string.Empty;
}

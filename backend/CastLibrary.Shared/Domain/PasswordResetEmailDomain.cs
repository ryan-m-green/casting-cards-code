namespace CastLibrary.Shared.Domain;

public class PasswordResetEmailDomain : IEmailDomain
{
    public string ToEmail     { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string ResetLink   { get; set; } = string.Empty;
}

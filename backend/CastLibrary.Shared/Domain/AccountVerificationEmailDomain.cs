namespace CastLibrary.Shared.Domain;

public class AccountVerificationEmailDomain : IEmailDomain
{
    public string ToEmail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string VerificationLink { get; set; } = string.Empty;
}

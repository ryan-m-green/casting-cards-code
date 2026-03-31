namespace CastLibrary.Shared.Domain;

public class PasswordResetTokenDomain
{
    public Guid      Id        { get; set; }
    public Guid      UserId    { get; set; }
    public string    TokenHash { get; set; } = string.Empty;
    public DateTime  ExpiresAt { get; set; }
    public DateTime? UsedAt    { get; set; }
}

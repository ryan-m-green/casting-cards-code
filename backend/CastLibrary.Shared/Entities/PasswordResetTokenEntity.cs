namespace CastLibrary.Shared.Entities;

public class PasswordResetTokenEntity
{
    public Guid      Id        { get; set; }
    public Guid      UserId    { get; set; }
    public string    TokenHash { get; set; } = string.Empty;
    public DateTime  ExpiresAt { get; set; }
    public DateTime? UsedAt    { get; set; }
}

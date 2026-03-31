namespace CastLibrary.Shared.Domain;

public class AdminInviteCodeDomain
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

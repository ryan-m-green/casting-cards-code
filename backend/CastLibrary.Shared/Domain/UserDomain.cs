using CastLibrary.Shared.Enums;
namespace CastLibrary.Shared.Domain;

public class UserDomain
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string[] Keywords { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

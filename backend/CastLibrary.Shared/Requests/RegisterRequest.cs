namespace CastLibrary.Shared.Requests;

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "Player";
    public string InviteCode { get; set; } = string.Empty;
}

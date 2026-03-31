namespace CastLibrary.Shared.Responses;

public class AdminInviteCodeResponse
{
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

namespace CastLibrary.Shared.Domain;

public class CampaignInviteCodeDomain
{
    public Guid CampaignId { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class CampaignPlayerDomain
{
    public Guid CampaignId { get; set; }
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int StartingGold { get; set; }
    public DateTime JoinedAt { get; set; }
}

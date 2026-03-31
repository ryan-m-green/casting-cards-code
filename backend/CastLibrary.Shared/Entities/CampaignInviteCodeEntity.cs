namespace CastLibrary.Shared.Entities;

public class CampaignInviteCodeEntity
{
    public Guid CampaignId { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class CampaignPlayerEntity
{
    public Guid CampaignId { get; set; }
    public Guid PlayerUserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int StartingGold { get; set; }
    public int CurrentGold { get; set; }
    public DateTime JoinedAt { get; set; }
}

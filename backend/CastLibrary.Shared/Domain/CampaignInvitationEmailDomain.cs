namespace CastLibrary.Shared.Domain;

public class CampaignInvitationEmailDomain : IEmailDomain
{
    public string ToEmail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string InvitationLink { get; set; } = string.Empty;
    public string InviterName { get; set; } = string.Empty;
}

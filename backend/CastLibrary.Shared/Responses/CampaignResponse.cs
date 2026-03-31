namespace CastLibrary.Shared.Responses;

public class CampaignListResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FantasyType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string SpineColor { get; set; } = string.Empty;
    public int PlayerCount { get; set; }
    public int CityCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CampaignDetailResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FantasyType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string SpineColor { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<CampaignCityInstanceResponse> Cities { get; set; } = [];
    public List<CampaignCastInstanceResponse> Casts { get; set; } = [];
    public List<CampaignLocationInstanceResponse> Locations { get; set; } = [];
    public List<CampaignSecretResponse> Secrets { get; set; } = [];
    public List<CampaignPlayerResponse> Players { get; set; } = [];
    public List<CampaignCastRelationshipResponse> Relationships { get; set; } = [];
    public CampaignInviteCodeResponse? InviteCode { get; set; }
}

public class CampaignInviteCodeResponse
{
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class CampaignCastRelationshipResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid SourceCastInstanceId { get; set; }
    public Guid TargetCastInstanceId { get; set; }
    public int Value { get; set; }
    public string? Explanation { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CampaignCityInstanceResponse
{
    public Guid InstanceId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? SourceCityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Condition { get; set; } = string.Empty;
    public string Geography { get; set; } = string.Empty;
    public string Architecture { get; set; } = string.Empty;
    public string Climate { get; set; } = string.Empty;
    public string Religion { get; set; } = string.Empty;
    public string Vibe { get; set; } = string.Empty;
    public string Languages { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; }
    public bool IsVisibleToPlayers { get; set; }
    public int SortOrder { get; set; }
    public string[] Keywords { get; set; } = [];
}

public record CampaignCastCustomItemResponse(string Name, string Price);

public class CampaignCastInstanceResponse
{
    public Guid InstanceId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? SourceCastId { get; set; }
    public Guid? CityInstanceId { get; set; }
    public Guid? LocationInstanceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Pronouns { get; set; } = string.Empty;
    public string Race { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Age { get; set; } = string.Empty;
    public string Alignment { get; set; } = string.Empty;
    public string Posture { get; set; } = string.Empty;
    public string Speed { get; set; } = string.Empty;
    public string[] VoicePlacement { get; set; } = [];
    public string Description { get; set; } = string.Empty;
    public string PublicDescription { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsVisibleToPlayers { get; set; }
    public List<CampaignCastCustomItemResponse> CustomItems { get; set; } = [];
    public string[] Keywords { get; set; } = [];
}

public class CampaignSecretResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? CastInstanceId { get; set; }
    public Guid? CityInstanceId { get; set; }
    public Guid? LocationInstanceId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsRevealed { get; set; }
    public DateTime? RevealedAt { get; set; }
}

public class CampaignLocationInstanceResponse
{
    public Guid InstanceId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? SourceLocationId { get; set; }
    public Guid? CityInstanceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImagePath { get; set; }
    public bool IsVisibleToPlayers { get; set; }
    public List<ShopItemResponse> ShopItems { get; set; } = [];
    public List<CampaignCastCustomItemResponse> CustomItems { get; set; } = [];
    public string[] Keywords { get; set; } = [];
}

public class CampaignPlayerResponse
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int StartingGold { get; set; }
    public int CurrentGold { get; set; }
}

public class DashboardStatsResponse
{
    public int CampaignCount { get; set; }
    public int CityCount { get; set; }
    public int LocationCount { get; set; }
    public int CastCount { get; set; }
    public CampaignListResponse ActiveCampaign { get; set; }
}

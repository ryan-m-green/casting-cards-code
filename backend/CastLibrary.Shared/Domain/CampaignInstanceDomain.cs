namespace CastLibrary.Shared.Domain;

public record CampaignCastCustomItemDomain(string Name, string Price);

public class CampaignCastInstanceDomain
{
    public Guid InstanceId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? SourceCastId { get; set; }
    public Guid? LocationInstanceId { get; set; }
    public Guid? SublocationInstanceId { get; set; }
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
    public bool IsVisibleToPlayers { get; set; }
    public List<CampaignCastCustomItemDomain> CustomItems { get; set; } = [];
    public string[] Keywords { get; set; } = [];
    public string DmNotes { get; set; } = string.Empty;
}

public class CampaignLocationInstanceDomain
{
    public Guid InstanceId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? SourceLocationId { get; set; }
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
    public bool IsVisibleToPlayers { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string[] Keywords { get; set; } = [];
    public string DmNotes { get; set; } = string.Empty;
}

public class CampaignSublocationInstanceDomain
{
    public Guid InstanceId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? SourceSublocationId { get; set; }
    public Guid? LocationInstanceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsVisibleToPlayers { get; set; }
    public string DmNotes { get; set; } = string.Empty;
    public List<ShopItemDomain> ShopItems { get; set; } = [];
    public List<CampaignCastCustomItemDomain> CustomItems { get; set; } = [];
    public string[] Keywords { get; set; } = [];
}


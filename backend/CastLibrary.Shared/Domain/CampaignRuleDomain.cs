namespace CastLibrary.Shared.Domain;

public class CampaignRuleDefinition
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Definition { get; set; } = string.Empty;
}

public class CampaignRuleDomain
{
    public Guid Id { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Definition { get; set; } = string.Empty;
    public List<CampaignRuleDefinition> Children { get; set; } = [];
    public List<string> Keywords { get; set; } = [];
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsGroup => Children.Count > 0;
}

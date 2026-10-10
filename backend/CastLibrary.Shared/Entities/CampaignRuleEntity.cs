namespace CastLibrary.Shared.Entities;

public class CampaignRuleEntity
{
    public Guid Id { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Definition { get; set; } = string.Empty;
    public string Children { get; set; } = "[]";
    public string[] Keywords { get; set; } = [];
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

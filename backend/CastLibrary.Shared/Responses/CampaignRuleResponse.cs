using CastLibrary.Shared.Domain;

namespace CastLibrary.Shared.Responses;

public class CampaignRuleResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Definition { get; set; } = string.Empty;

    public List<CampaignRuleDefinition> Children { get; set; } = [];

    public List<string> Keywords { get; set; } = [];

    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

namespace CastLibrary.Shared.Requests;

public class CampaignRuleDefinitionRequest
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Definition { get; set; } = string.Empty;
}

public class CreateCampaignRuleRequest
{
    public string Name { get; set; } = string.Empty;
    public string Definition { get; set; } = string.Empty;
    public List<CampaignRuleDefinitionRequest> Children { get; set; } = [];
    public List<string> Keywords { get; set; } = [];
}

public class UpdateCampaignRuleRequest : CreateCampaignRuleRequest
{
}

public class LinkCampaignRulesRequest
{
    public List<Guid> RuleIds { get; set; } = [];
}

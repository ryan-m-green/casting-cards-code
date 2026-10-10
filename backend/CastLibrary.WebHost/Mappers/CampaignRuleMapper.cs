using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface ICampaignRuleMapper
{
    CampaignRuleResponse ToResponse(CampaignRuleDomain domain);
}

public class CampaignRuleMapper : ICampaignRuleMapper
{
    public CampaignRuleResponse ToResponse(CampaignRuleDomain domain) => new()
    {
        Id         = domain.Id,
        Name       = domain.Name,
        Definition = domain.Definition,
        Children   = domain.Children,
        Keywords   = domain.Keywords,
        SortOrder  = domain.SortOrder,
        CreatedAt  = domain.CreatedAt,
        UpdatedAt  = domain.UpdatedAt,
    };
}

using System.Text.Json;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ICampaignRuleEntityMapper
{
    CampaignRuleDomain ToDomain(CampaignRuleEntity entity);
    CampaignRuleEntity ToEntity(CampaignRuleDomain domain);
}

public class CampaignRuleEntityMapper : ICampaignRuleEntityMapper
{
    public CampaignRuleDomain ToDomain(CampaignRuleEntity entity) => new()
    {
        Id         = entity.Id,
        DmUserId   = entity.DmUserId,
        Name       = entity.Name,
        Definition = entity.Definition,
        Children   = string.IsNullOrWhiteSpace(entity.Children)
            ? []
            : JsonSerializer.Deserialize<List<CampaignRuleDefinition>>(entity.Children) ?? [],
        Keywords   = [.. entity.Keywords ?? []],
        SortOrder  = entity.SortOrder,
        CreatedAt  = entity.CreatedAt,
        UpdatedAt  = entity.UpdatedAt,
    };

    public CampaignRuleEntity ToEntity(CampaignRuleDomain domain) => new()
    {
        Id         = domain.Id,
        DmUserId   = domain.DmUserId,
        Name       = domain.Name,
        Definition = domain.Definition,
        Children   = ToJson(domain.Children),
        Keywords   = [.. domain.Keywords],
        SortOrder  = domain.SortOrder,
        CreatedAt  = domain.CreatedAt,
        UpdatedAt  = domain.UpdatedAt,
    };

    public static string ToJson(List<CampaignRuleDefinition> children) =>
        children == null || children.Count == 0
            ? "[]"
            : JsonSerializer.Serialize(children);
}

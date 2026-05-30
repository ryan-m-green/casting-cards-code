using System.Text.Json;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ICampaignEventEntityMapper
{
    CampaignEventDomain ToDomain(CampaignEventEntity entity);
}

public class CampaignEventEntityMapper : ICampaignEventEntityMapper
{
    public CampaignEventDomain ToDomain(CampaignEventEntity entity) => new()
    {
        Id = entity.Id,
        CampaignId = entity.CampaignId,
        Title = entity.Title,
        Body = entity.Body,
        SortOrder = entity.SortOrder,
        LinkedEntities = string.IsNullOrWhiteSpace(entity.LinkedEntities) 
            ? [] 
            : JsonSerializer.Deserialize<List<LinkedEntityTrigger>>(entity.LinkedEntities) ?? [],
        FilePath = entity.FilePath,
        VisibleToPlayers = entity.VisibleToPlayers,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
    };

    public static string ToJson(List<LinkedEntityTrigger> linkedEntities) =>
        linkedEntities == null || linkedEntities.Count == 0 
            ? "[]" 
            : JsonSerializer.Serialize(linkedEntities);
}

using System.Text.Json;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ICampaignEventEntityMapper
{
    CampaignStorylineDomain ToDomain(CampaignEventEntity entity);
}

public class CampaignEventEntityMapper : ICampaignEventEntityMapper
{
    public CampaignStorylineDomain ToDomain(CampaignEventEntity entity) => new()
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
        MarkedForArchive = entity.MarkedForArchive,
        SceneType = entity.SceneType ?? "campaign-event",
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
    };

    public static string ToJson(List<LinkedEntityTrigger> linkedEntities) =>
        linkedEntities == null || linkedEntities.Count == 0 
            ? "[]" 
            : JsonSerializer.Serialize(linkedEntities);
}

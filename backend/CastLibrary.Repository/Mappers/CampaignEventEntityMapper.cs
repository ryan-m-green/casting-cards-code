using System.Text.Json;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ICampaignEventEntityMapper
{
    CampaignStorylineDomain ToDomain(CampaignEventEntity entity);
    CampaignEventEntity ToEntity(CampaignStorylineDomain domain);
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
        SoundtrackIds = string.IsNullOrWhiteSpace(entity.SoundtrackIds)
            ? []
            : JsonSerializer.Deserialize<List<Guid>>(entity.SoundtrackIds) ?? [],
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
    };

    public CampaignEventEntity ToEntity(CampaignStorylineDomain domain) => new()
    {
        Id = domain.Id,
        CampaignId = domain.CampaignId,
        Title = domain.Title,
        Body = domain.Body,
        SortOrder = domain.SortOrder,
        LinkedEntities = ToJson(domain.LinkedEntities),
        FilePath = domain.FilePath,
        VisibleToPlayers = domain.VisibleToPlayers,
        MarkedForArchive = domain.MarkedForArchive,
        SceneType = domain.SceneType,
        SoundtrackIds = ToJson(domain.SoundtrackIds),
        CreatedAt = domain.CreatedAt,
        UpdatedAt = domain.UpdatedAt,
    };

    public static string ToJson(List<LinkedEntityTrigger> linkedEntities) =>
        linkedEntities == null || linkedEntities.Count == 0 
            ? "[]" 
            : JsonSerializer.Serialize(linkedEntities);

    public static string ToJson(List<Guid> soundtrackIds) =>
        soundtrackIds == null || soundtrackIds.Count == 0 
            ? "[]" 
            : JsonSerializer.Serialize(soundtrackIds);
}

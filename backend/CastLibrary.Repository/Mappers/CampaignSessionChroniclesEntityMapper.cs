using System.Text.Json;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ICampaignSessionChroniclesEntityMapper
{
    CampaignSessionChroniclesDomain ToDomain(CampaignSessionChroniclesEntity entity);
}

public class CampaignSessionChroniclesEntityMapper : ICampaignSessionChroniclesEntityMapper
{
    public CampaignSessionChroniclesDomain ToDomain(CampaignSessionChroniclesEntity entity) => new()
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
        TodSliceName = entity.TodSliceName,
        ArchivedAt = entity.ArchivedAt,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
        Keywords = string.IsNullOrWhiteSpace(entity.Keywords) 
            ? [] 
            : JsonSerializer.Deserialize<string[]>(entity.Keywords) ?? [],
    };
}

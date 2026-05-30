using System.Text.Json;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ICampaignEventArchivedEntityMapper
{
    CampaignEventArchivedDomain ToDomain(CampaignEventArchivedEntity entity);
}

public class CampaignEventArchivedEntityMapper : ICampaignEventArchivedEntityMapper
{
    public CampaignEventArchivedDomain ToDomain(CampaignEventArchivedEntity entity) => new()
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
        InGameDay = entity.InGameDay,
        VisibleToPlayers = entity.VisibleToPlayers,
        ArchivedAt = entity.ArchivedAt,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
    };
}

using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IConditionEntityMapper
{
    ConditionDomain ToDomain(ConditionEntity entity);
    ConditionEntity ToEntity(ConditionDomain domain);
}

public class ConditionEntityMapper : IConditionEntityMapper
{
    public ConditionDomain ToDomain(ConditionEntity entity) => new()
    {
        Id          = entity.Id,
        GmUserId    = entity.GmUserId,
        Name        = entity.Name,
        Consequence = entity.Consequence,
        Keywords    = [.. entity.Keywords ?? []],
        Color       = entity.Color ?? string.Empty,
        SortOrder   = entity.SortOrder,
        CreatedAt   = entity.CreatedAt,
        UpdatedAt   = entity.UpdatedAt,
    };

    public ConditionEntity ToEntity(ConditionDomain domain) => new()
    {
        Id          = domain.Id,
        GmUserId    = domain.GmUserId,
        Name        = domain.Name,
        Consequence = domain.Consequence,
        Keywords    = [.. domain.Keywords],
        Color       = domain.Color,
        SortOrder   = domain.SortOrder,
        CreatedAt   = domain.CreatedAt,
        UpdatedAt   = domain.UpdatedAt,
    };
}

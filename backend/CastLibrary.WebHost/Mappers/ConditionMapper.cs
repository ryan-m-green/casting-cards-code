using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface IConditionMapper
{
    ConditionResponse ToResponse(ConditionDomain domain);
}

public class ConditionMapper : IConditionMapper
{
    public ConditionResponse ToResponse(ConditionDomain domain) => new()
    {
        Id          = domain.Id,
        Name        = domain.Name,
        Consequence = domain.Consequence,
        Keywords    = domain.Keywords,
        Color       = domain.Color,
        SortOrder   = domain.SortOrder,
        CreatedAt   = domain.CreatedAt,
        UpdatedAt   = domain.UpdatedAt,
    };
}

using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
namespace CastLibrary.Repository.Mappers;

public interface ILocationEntityMapper
{
    LocationDomain ToDomain(LocationEntity entity);
}
public class LocationEntityMapper : ILocationEntityMapper
{
    public LocationDomain ToDomain(LocationEntity entity) => new()
    {
        Id = entity.Id,
        DmUserId = entity.DmUserId,
        Name = entity.Name,
        Classification = entity.Classification ?? string.Empty,
        Size = entity.Size ?? string.Empty,
        Condition = entity.Condition ?? string.Empty,
        Geography = entity.Geography ?? string.Empty,
        Architecture = entity.Architecture ?? string.Empty,
        Climate = entity.Climate ?? string.Empty,
        Religion = entity.Religion ?? string.Empty,
        Vibe = entity.Vibe ?? string.Empty,
        Languages = entity.Languages ?? string.Empty,
        Description = entity.Description ?? string.Empty,
        CreatedAt = entity.CreatedAt,
    };
}

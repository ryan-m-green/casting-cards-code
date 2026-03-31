using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
namespace CastLibrary.Repository.Mappers;

public interface ICityEntityMapper
{
    CityDomain ToDomain(CityEntity entity);
}
public class CityEntityMapper : ICityEntityMapper
{
    public CityDomain ToDomain(CityEntity entity) => new()
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

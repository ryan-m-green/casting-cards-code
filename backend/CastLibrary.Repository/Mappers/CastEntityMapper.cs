using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
namespace CastLibrary.Repository.Mappers;

public interface ICastEntityMapper
{
    CastDomain ToDomain(CastEntity entity);
    CastEntity ToEntity(CastDomain domain);
}
public class CastEntityMapper : ICastEntityMapper
{
    public CastDomain ToDomain(CastEntity entity) => new()
    {
        Id = entity.Id,
        DmUserId = entity.DmUserId,
        Name = entity.Name,
        Pronouns = entity.Pronouns ?? string.Empty,
        Race = entity.Race ?? string.Empty,
        Role = entity.Role ?? string.Empty,
        Age = entity.Age ?? string.Empty,
        Alignment = entity.Alignment ?? string.Empty,
        Posture = entity.Posture ?? string.Empty,
        Speed = entity.Speed ?? string.Empty,
        VoicePlacement = entity.VoicePlacement ?? [],
        Description = entity.Description ?? string.Empty,
        PublicDescription = entity.PublicDescription ?? string.Empty,
        CreatedAt = entity.CreatedAt,
    };

    public CastEntity ToEntity(CastDomain domain) => new()
    {
        Id = domain.Id,
        DmUserId = domain.DmUserId,
        Name = domain.Name,
        Pronouns = domain.Pronouns,
        Race = domain.Race,
        Role = domain.Role,
        Age = domain.Age,
        Alignment = domain.Alignment,
        Posture = domain.Posture,
        Speed = domain.Speed,
        VoicePlacement = domain.VoicePlacement,
        Description = domain.Description,
        PublicDescription = domain.PublicDescription,
        CreatedAt = domain.CreatedAt,
    };
}

using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IFactionEntityMapper
{
    FactionDomain ToDomain(FactionEntity entity);
    FactionEntity ToEntity(FactionDomain domain);
}

public class FactionEntityMapper : IFactionEntityMapper
{
    public FactionDomain ToDomain(FactionEntity entity) => new()
    {
        FactionId  = entity.FactionId,
        DmUserId   = entity.DmUserId,
        Name       = entity.Name,
        Type       = entity.Type,
        Influence  = entity.Influence,
        Perception = entity.Perception,
        Hidden     = entity.Hidden,
        Description = entity.Description,
        DmNotes    = entity.DmNotes,
        SymbolPath = entity.SymbolPath,
        CreatedAt  = entity.CreatedAt,
    };

    public FactionEntity ToEntity(FactionDomain domain) => new()
    {
        FactionId  = domain.FactionId,
        DmUserId   = domain.DmUserId,
        Name       = domain.Name,
        Type       = domain.Type,
        Influence  = domain.Influence,
        Perception = domain.Perception,
        Hidden     = domain.Hidden,
        Description = domain.Description,
        DmNotes    = domain.DmNotes,
        SymbolPath = domain.SymbolPath,
        CreatedAt  = domain.CreatedAt,
    };
}

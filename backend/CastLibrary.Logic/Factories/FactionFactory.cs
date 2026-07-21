using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Factories;

public interface IFactionFactory
{
    FactionDomain Create(CreateFactionRequest request, Guid dmUserId);
}

public class FactionFactory : IFactionFactory
{
    public FactionDomain Create(CreateFactionRequest request, Guid dmUserId) => new()
    {
        FactionId  = Guid.NewGuid(),
        DmUserId   = dmUserId,
        Name       = request.Name,
        Type       = request.Type,
        Influence  = request.Influence,
        Perception = request.Perception,
        Hidden     = request.Hidden,
        Description = request.Description,
        DmNotes    = request.DmNotes,
        SymbolPath = request.SymbolPath,
        Colors     = request.Colors,
        CreatedAt  = DateTime.UtcNow,
    };
}

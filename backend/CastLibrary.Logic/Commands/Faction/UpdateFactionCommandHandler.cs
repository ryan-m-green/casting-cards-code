using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Faction;

public interface IUpdateFactionCommandHandler
{
    Task<FactionDomain?> HandleAsync(UpdateFactionCommand command);
}

public class UpdateFactionCommandHandler(
    IFactionReadRepository factionReadRepository,
    IFactionUpdateRepository factionUpdateRepository) : IUpdateFactionCommandHandler
{
    public async Task<FactionDomain?> HandleAsync(UpdateFactionCommand command)
    {
        var existing = await factionReadRepository.GetByIdAsync(command.FactionId);
        if (existing is null || existing.DmUserId != command.DmUserId)
            return null;

        existing.Name       = command.Request.Name;
        existing.Type       = command.Request.Type;
        existing.Influence  = command.Request.Influence;
        existing.Perception = command.Request.Perception;
        existing.Hidden     = command.Request.Hidden;
        existing.Description = command.Request.Description;
        existing.DmNotes    = command.Request.DmNotes;
        existing.SymbolPath = command.Request.SymbolPath;

        return await factionUpdateRepository.UpdateAsync(existing);
    }
}

public class UpdateFactionCommand
{
    public UpdateFactionCommand(Guid factionId, Guid dmUserId, CreateFactionRequest request)
    {
        FactionId = factionId;
        DmUserId  = dmUserId;
        Request   = request;
    }

    public Guid FactionId { get; }
    public Guid DmUserId { get; }
    public CreateFactionRequest Request { get; }
}

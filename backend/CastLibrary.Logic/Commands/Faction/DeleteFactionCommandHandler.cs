using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Faction;

public interface IDeleteFactionCommandHandler
{
    Task<bool> HandleAsync(DeleteFactionCommand command);
}

public class DeleteFactionCommandHandler(
    IFactionReadRepository factionReadRepository,
    IFactionDeleteRepository factionDeleteRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IDeleteFactionCommandHandler
{
    public async Task<bool> HandleAsync(DeleteFactionCommand command)
    {
        var faction = await factionReadRepository.GetByIdAsync(command.FactionId);
        if (faction is null || faction.DmUserId != command.DmUserId)
            return false;

        var imagePath = imageKeyCreator.Create(faction.DmUserId, Guid.Empty, faction.FactionId, EntityType.Faction);
        if (!string.IsNullOrEmpty(imagePath))
            await imageStorage.DeleteAsync(imagePath);

        await factionDeleteRepository.DeleteAsync(command.FactionId);
        return true;
    }
}

public class DeleteFactionCommand
{
    public DeleteFactionCommand(Guid factionId, Guid dmUserId)
    {
        FactionId = factionId;
        DmUserId  = dmUserId;
    }

    public Guid FactionId { get; }
    public Guid DmUserId { get; }
}

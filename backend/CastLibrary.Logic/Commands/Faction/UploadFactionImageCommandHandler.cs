using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Faction;

public interface IUploadFactionImageCommandHandler
{
    Task<(bool Success, string ImageKey)> HandleAsync(UploadFactionImageCommand command);
}

public class UploadFactionImageCommandHandler(
    IFactionReadRepository factionReadRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IUploadFactionImageCommandHandler
{
    public async Task<(bool Success, string ImageKey)> HandleAsync(UploadFactionImageCommand command)
    {
        var faction = await factionReadRepository.GetByIdAsync(command.FactionId);
        if (faction is null || faction.DmUserId != command.DmUserId)
            return (false, string.Empty);

        var key = imageKeyCreator.Create(faction.DmUserId, Guid.Empty, command.FactionId, EntityType.Faction);

        await imageStorage.SaveAsync(key, command.Stream, command.ContentType);

        return (true, key);
    }
}

public class UploadFactionImageCommand
{
    public UploadFactionImageCommand(Guid factionId, Guid dmUserId, Stream stream, string contentType)
    {
        FactionId   = factionId;
        DmUserId    = dmUserId;
        Stream      = stream;
        ContentType = contentType;
    }

    public Guid FactionId { get; }
    public Guid DmUserId { get; }
    public Stream Stream { get; }
    public string ContentType { get; }
}

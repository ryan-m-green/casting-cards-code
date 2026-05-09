using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.Faction;

public interface IUploadFactionImageCommandHandler
{
    Task<(bool Success, string ImageKey)> HandleAsync(UploadFactionImageCommand command);
}

public class UploadFactionImageCommandHandler(
    IFactionReadRepository factionReadRepository,
    IImageStorageOperator imageStorage) : IUploadFactionImageCommandHandler
{
    public async Task<(bool Success, string ImageKey)> HandleAsync(UploadFactionImageCommand command)
    {
        var faction = await factionReadRepository.GetByIdAsync(command.FactionId);
        if (faction is null || faction.DmUserId != command.DmUserId)
            return (false, string.Empty);

        var key = $"{faction.DmUserId}/factions/{command.FactionId}.png";

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

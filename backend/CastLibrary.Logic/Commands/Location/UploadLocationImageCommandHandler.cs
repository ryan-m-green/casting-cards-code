using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Location;

public interface IUploadLocationImageCommandHandler
{
    Task<(bool Success, string ImageKey)> HandleAsync(UploadLocationImageCommand command);
}
public class UploadLocationImageCommandHandler(
    ILocationReadRepository locationRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IUploadLocationImageCommandHandler
{
    private static readonly Dictionary<string, string> ContentTypeExtensions = new()
    {
        { "image/jpeg", ".jpg" },
        { "image/png",  ".png" },
        { "image/webp", ".webp" }
    };

    public async Task<(bool Success, string ImageKey)> HandleAsync(UploadLocationImageCommand command)
    {
        var location = await locationRepository.GetByIdAsync(command.LocationId);
        if (location is null || location.DmUserId != command.DmUserId)
            return (false, null);

        var key = imageKeyCreator.Create(command.DmUserId, command.LocationId, EntityType.Location);

        await imageStorage.SaveAsync(key, command.Stream, command.ContentType);

        return (true, key);
    }
}

public class UploadLocationImageCommand
{
    public UploadLocationImageCommand(Guid locationId, Guid dmUserId, Stream stream, string contentType)
    {
        LocationId = locationId;
        DmUserId = dmUserId;
        Stream = stream;
        ContentType = contentType;
    }

    public Guid LocationId { get; }
    public Guid DmUserId { get; }
    public Stream Stream { get; }
    public string ContentType { get; }
}

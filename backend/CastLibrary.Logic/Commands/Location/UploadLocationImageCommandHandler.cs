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
    ILocationReadRepository locationReadRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IUploadLocationImageCommandHandler
{
    public async Task<(bool Success, string ImageKey)> HandleAsync(UploadLocationImageCommand command)
    {
        var location = await locationReadRepository.GetByIdAsync(command.LocationId);
        if (location is null || location.DmUserId != command.DmUserId)
        {
            return (false, null);
        }

        var key = imageKeyCreator.Create(command.DmUserId, command.LocationId, EntityType.Location);

        await imageStorage.SaveAsync(key, command.Stream, command.ContentType);

        return (true, key);
    }
}

public class UploadLocationImageCommand
{
    public UploadLocationImageCommand(Guid LocationId, Guid dmUserId, Stream stream, string contentType)
    {
        LocationId = LocationId;
        DmUserId = dmUserId;
        Stream = stream;
        ContentType = contentType;
    }

    public Guid LocationId { get; }
    public Guid DmUserId { get; }
    public Stream Stream { get; }
    public string ContentType { get; }
}


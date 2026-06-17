using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Cast;

public interface IUploadCastImageCommandHandler
{
    Task<(bool Success, string ImageUrl)> HandleAsync(UploadCastImageCommand command);
}
public class UploadCastImageCommandHandler(
    ICastReadRepository castReadRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IUploadCastImageCommandHandler
{
    public async Task<(bool Success, string ImageUrl)> HandleAsync(UploadCastImageCommand command)
    {
        var cast = await castReadRepository.GetByIdAsync(command.CastId);
        if (cast is null || cast.DmUserId != command.DmUserId)
            return (false, null);

        var key = imageKeyCreator.Create(cast.DmUserId, Guid.Empty, command.CastId, EntityType.Cast);

        await imageStorage.SaveAsync(key, command.Stream, command.ContentType);

        var imageUrl = imageStorage.GetPublicUrl(key);
        return (true, imageUrl);
    }
}

public class UploadCastImageCommand
{
    public UploadCastImageCommand(Guid castId, Guid dmUserId, Stream stream, string contentType)
    {
        CastId = castId;
        DmUserId = dmUserId;
        Stream = stream;
        ContentType = contentType;
    }

    public Guid CastId { get; }
    public Guid DmUserId { get; }
    public Stream Stream { get; }
    public string ContentType { get; }
}


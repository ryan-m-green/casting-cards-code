using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.Cast;

public interface IUploadCastImageCommandHandler
{
    Task<(bool Success, string ImageKey)> HandleAsync(UploadCastImageCommand command);
}
public class UploadCastImageCommandHandler(
    ICastReadRepository castReadRepository,
    IImageStorageOperator imageStorage) : IUploadCastImageCommandHandler
{
    private static readonly Dictionary<string, string> ContentTypeExtensions = new()
    {
        { "image/jpeg", ".jpg" },
        { "image/png",  ".png" },
        { "image/webp", ".webp" }
    };

    public async Task<(bool Success, string ImageKey)> HandleAsync(UploadCastImageCommand command)
    {
        var cast = await castReadRepository.GetByIdAsync(command.CastId);
        if (cast is null || cast.DmUserId != command.DmUserId)
            return (false, null);

        var ext = ContentTypeExtensions.GetValueOrDefault(command.ContentType, ".jpg");
        var key = $"{cast.DmUserId}/casts/{command.CastId}{ext}";

        await imageStorage.SaveAsync(key, command.Stream, command.ContentType);

        return (true, key);
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

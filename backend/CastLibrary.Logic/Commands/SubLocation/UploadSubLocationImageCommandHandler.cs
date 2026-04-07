using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Sublocation;

public interface IUploadSublocationImageCommandHandler
{
    Task<(bool Success, string ImageKey)> HandleAsync(UploadSublocationImageCommand command);
}
public class UploadSublocationImageCommandHandler(
    ISublocationReadRepository sublocationRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IUploadSublocationImageCommandHandler
{
    private static readonly Dictionary<string, string> ContentTypeExtensions = new()
    {
        { "image/jpeg", ".jpg" },
        { "image/png",  ".png" },
        { "image/webp", ".webp" }
    };

    public async Task<(bool Success, string ImageKey)> HandleAsync(UploadSublocationImageCommand command)
    {
        var sublocation = await sublocationRepository.GetByIdAsync(command.SublocationId);
        if (sublocation is null || sublocation.DmUserId != command.DmUserId)
            return (false, null);

        var key = imageKeyCreator.Create(command.DmUserId, command.SublocationId, EntityType.Sublocation);

        await imageStorage.SaveAsync(key, command.Stream, command.ContentType);

        return (true, key);
    }
}

public class UploadSublocationImageCommand
{
    public UploadSublocationImageCommand(Guid sublocationId, Guid dmUserId, Stream stream, string contentType)
    {
        SublocationId = sublocationId;
        DmUserId = dmUserId;
        Stream = stream;
        ContentType = contentType;
    }

    public Guid SublocationId { get; }
    public Guid DmUserId { get; }
    public Stream Stream { get; }
    public string ContentType { get; }
}

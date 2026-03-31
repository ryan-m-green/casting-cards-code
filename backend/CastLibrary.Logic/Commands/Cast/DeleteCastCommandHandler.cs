using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Cast;

public interface IDeleteCastCommandHandler
{
    Task<bool> HandleAsync(DeleteCastCommand command);
}
public class DeleteCastCommandHandler(
    ICastReadRepository castReadRepository,
    ICastDeleteRepository castDeleteRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IDeleteCastCommandHandler
{
    public async Task<bool> HandleAsync(DeleteCastCommand command)
    {
        var cast = await castReadRepository.GetByIdAsync(command.CastId);
        if (cast is null || cast.DmUserId != command.DmUserId)
            return false;

        var imagePath = imageKeyCreator.Create(cast.DmUserId, cast.Id, EntityType.Cast);

        if (!string.IsNullOrEmpty(imagePath))
            await imageStorage.DeleteAsync(imagePath);
        await castDeleteRepository.DeleteAsync(command.CastId);
        return true;
    }
}

public class DeleteCastCommand
{
    public DeleteCastCommand(Guid castId, Guid dmUserId)
    {
        CastId = castId;
        DmUserId = dmUserId;
    }

    public Guid CastId { get; }
    public Guid DmUserId { get; }
}

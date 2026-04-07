using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Sublocation;

public interface IDeleteSublocationCommandHandler
{
    Task<bool> HandleAsync(DeleteSublocationCommand command);
}
public class DeleteSublocationCommandHandler(
    ISublocationReadRepository sublocationReadRepository,
    ISublocationDeleteRepository sublocationDeleteRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IDeleteSublocationCommandHandler
{
    public async Task<bool> HandleAsync(DeleteSublocationCommand command)
    {
        var sublocation = await sublocationReadRepository.GetByIdAsync(command.SublocationId);
        if (sublocation is null || sublocation.DmUserId != command.DmUserId)
            return false;

        var imagePath = imageKeyCreator.Create(sublocation.DmUserId, sublocation.Id, EntityType.Sublocation);

        if (!string.IsNullOrEmpty(imagePath))
            await imageStorage.DeleteAsync(imagePath);

        await sublocationDeleteRepository.DeleteAsync(command.SublocationId);
        return true;
    }
}

public class DeleteSublocationCommand
{
    public DeleteSublocationCommand(Guid sublocationId, Guid dmUserId)
    {
        SublocationId = sublocationId;
        DmUserId = dmUserId;
    }

    public Guid SublocationId { get; }
    public Guid DmUserId { get; }
}

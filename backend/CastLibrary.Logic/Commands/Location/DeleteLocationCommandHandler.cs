using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Location;

public interface IDeleteLocationCommandHandler
{
    Task<bool> HandleAsync(DeleteLocationCommand command);
}
public class DeleteLocationCommandHandler(
    ILocationReadRepository locationReadRepository, 
    ILocationDeleteRepository locationDeleteRepository,
    IImageStorageOperator imageStorage, 
    IImageKeyCreator imageKeyCreator) : IDeleteLocationCommandHandler
{
    public async Task<bool> HandleAsync(DeleteLocationCommand command)
    {
        var location = await locationReadRepository.GetByIdAsync(command.LocationId);
        if (location is null || location.DmUserId != command.DmUserId)
            return false;
        var imagePath = imageKeyCreator.Create(location.DmUserId, location.Id, EntityType.Location);
        if (!string.IsNullOrEmpty(imagePath))
            await imageStorage.DeleteAsync(imagePath);

        await locationDeleteRepository.DeleteAsync(command.LocationId);
        return true;
    }
}

public class DeleteLocationCommand
{
    public DeleteLocationCommand(Guid LocationId, Guid dmUserId)
    {
        LocationId = LocationId;
        DmUserId = dmUserId;
    }

    public Guid LocationId { get; }
    public Guid DmUserId { get; }
}


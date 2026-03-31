using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.City;

public interface IDeleteCityCommandHandler
{
    Task<bool> HandleAsync(DeleteCityCommand command);
}
public class DeleteCityCommandHandler(
    ICityReadRepository cityReadRepository, 
    ICityDeleteRepository cityDeleteRepository,
    IImageStorageOperator imageStorage, 
    IImageKeyCreator imageKeyCreator) : IDeleteCityCommandHandler
{
    public async Task<bool> HandleAsync(DeleteCityCommand command)
    {
        var city = await cityReadRepository.GetByIdAsync(command.CityId);
        if (city is null || city.DmUserId != command.DmUserId)
            return false;
        var imagePath = imageKeyCreator.Create(city.DmUserId, city.Id, EntityType.City);
        if (!string.IsNullOrEmpty(imagePath))
            await imageStorage.DeleteAsync(imagePath);

        await cityDeleteRepository.DeleteAsync(command.CityId);
        return true;
    }
}

public class DeleteCityCommand
{
    public DeleteCityCommand(Guid cityId, Guid dmUserId)
    {
        CityId = cityId;
        DmUserId = dmUserId;
    }

    public Guid CityId { get; }
    public Guid DmUserId { get; }
}

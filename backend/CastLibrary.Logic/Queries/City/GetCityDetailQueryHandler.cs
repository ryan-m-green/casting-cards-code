using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.City;

public interface IGetCityDetailQueryHandler
{
    Task<CityDomain> HandleAsync(Guid id);
}
public class GetCityDetailQueryHandler(ICityReadRepository cityReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetCityDetailQueryHandler
{
    public async Task<CityDomain> HandleAsync(Guid id)
    {
        var cityDomain = await cityReadRepository.GetByIdAsync(id);

        var imageKey = imageKeyCreator.Create(cityDomain.DmUserId, cityDomain.Id, EntityType.City);

        cityDomain.ImageUrl = imageStorageOperator.GetPublicUrl(imageKey);

        return cityDomain;
    }
}

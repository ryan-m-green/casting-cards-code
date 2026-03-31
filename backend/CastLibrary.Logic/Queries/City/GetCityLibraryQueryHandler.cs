using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.City;

public interface IGetCityLibraryQueryHandler
{
    Task<List<CityDomain>> HandleAsync(Guid dmUserId);
}
public class GetCityLibraryQueryHandler(ICityReadRepository cityReadRepository, 
    IImageKeyCreator imageKeyCreator, 
    IImageStorageOperator imageStorageOperator) : IGetCityLibraryQueryHandler
{
    public async Task<List<CityDomain>> HandleAsync(Guid dmUserId)
    {
        var cityDomains = await cityReadRepository.GetAllByDmAsync(dmUserId);

        var options = new ParallelOptions() { MaxDegreeOfParallelism = 4 };
        Parallel.ForEach(cityDomains, options, city =>
        {
            var imageKey = imageKeyCreator.Create(city.DmUserId, city.Id, EntityType.City);
            city.ImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
        });
        return cityDomains;
    }

}

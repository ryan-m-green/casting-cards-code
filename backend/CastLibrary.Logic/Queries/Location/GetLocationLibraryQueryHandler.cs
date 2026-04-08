using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.Location;

public interface IGetLocationLibraryQueryHandler
{
    Task<List<LocationDomain>> HandleAsync(Guid dmUserId);
}
public class GetLocationLibraryQueryHandler(ILocationReadRepository locationReadRepository, 
    IImageKeyCreator imageKeyCreator, 
    IImageStorageOperator imageStorageOperator) : IGetLocationLibraryQueryHandler
{
    public async Task<List<LocationDomain>> HandleAsync(Guid dmUserId)
    {
        var locationDomains = await locationReadRepository.GetAllByDmAsync(dmUserId);

        var options = new ParallelOptions() { MaxDegreeOfParallelism = 4 };
        Parallel.ForEach(locationDomains, options, location =>
        {
            var imageKey = imageKeyCreator.Create(location.DmUserId, location.Id, EntityType.Location);
            location.ImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
        });
        return locationDomains;
    }

}


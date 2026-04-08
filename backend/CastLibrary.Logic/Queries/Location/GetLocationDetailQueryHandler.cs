using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.Location;

public interface IGetLocationDetailQueryHandler
{
    Task<LocationDomain> HandleAsync(Guid id);
}
public class GetLocationDetailQueryHandler(ILocationReadRepository locationReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetLocationDetailQueryHandler
{
    public async Task<LocationDomain> HandleAsync(Guid id)
    {
        var locationDomain = await locationReadRepository.GetByIdAsync(id);

        var imageKey = imageKeyCreator.Create(locationDomain.DmUserId, locationDomain.Id, EntityType.Location);

        locationDomain.ImageUrl = imageStorageOperator.GetPublicUrl(imageKey);

        return locationDomain;
    }
}



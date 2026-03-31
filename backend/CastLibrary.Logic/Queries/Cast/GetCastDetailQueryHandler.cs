using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.Cast;

public interface IGetCastDetailQueryHandler
{
    Task<CastDomain> HandleAsync(Guid id);
}
public class GetCastDetailQueryHandler(ICastReadRepository castReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetCastDetailQueryHandler
{
    public async Task<CastDomain> HandleAsync(Guid id)
    {
        var cast = await castReadRepository.GetByIdAsync(id);

        var imageKey = imageKeyCreator.Create(cast.DmUserId, cast.Id, EntityType.Cast);

        cast.ImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
        return cast;

    }
}

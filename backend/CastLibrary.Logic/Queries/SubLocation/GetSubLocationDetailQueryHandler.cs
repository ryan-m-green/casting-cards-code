using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.Sublocation;

public interface IGetSublocationDetailQueryHandler
{
    Task<SublocationDomain> HandleAsync(Guid id);
}
public class GetSublocationDetailQueryHandler(ISublocationReadRepository sublocationReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetSublocationDetailQueryHandler
{
    public async Task<SublocationDomain> HandleAsync(Guid id)
    {
        var sublocation = await sublocationReadRepository.GetByIdAsync(id);

        var imageKey = imageKeyCreator.Create(sublocation.DmUserId, sublocation.Id, EntityType.Sublocation);
        sublocation.ImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
        return sublocation;
    }

}

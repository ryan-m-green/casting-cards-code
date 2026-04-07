using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.Sublocation;

public interface IGetSublocationLibraryQueryHandler
{
    Task<List<SublocationDomain>> HandleAsync(Guid dmUserId);
}
public class GetSublocationLibraryQueryHandler(ISublocationReadRepository sublocationRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetSublocationLibraryQueryHandler
{
    public async Task<List<SublocationDomain>> HandleAsync(Guid dmUserId)
    {
        var sublocations = await sublocationRepository.GetAllByDmAsync(dmUserId);

        var options = new ParallelOptions() { MaxDegreeOfParallelism = 4 };
        Parallel.ForEach(sublocations, options, sublocation =>
        {
            var imageKey = imageKeyCreator.Create(sublocation.DmUserId, sublocation.Id, EntityType.Sublocation);
            sublocation.ImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
        });
        return sublocations;
    }

}

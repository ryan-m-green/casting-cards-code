using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.Cast;

public interface IGetCastLibraryQueryHandler
{
    Task<List<CastDomain>> HandleAsync(Guid dmUserId);
}
public class GetCastLibraryQueryHandler(ICastReadRepository castReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetCastLibraryQueryHandler
{
    public async Task<List<CastDomain>> HandleAsync(Guid dmUserId)
    {
        var cast = await castReadRepository.GetAllByDmAsync(dmUserId);

        var options = new ParallelOptions() { MaxDegreeOfParallelism = 4 };
        Parallel.ForEach(cast, options, member =>
        {
            var imageKey = imageKeyCreator.Create(member.DmUserId, member.Id, EntityType.Cast);
            member.ImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
        });

        return cast;
    }

}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.Faction;

public interface IGetFactionLibraryQueryHandler
{
    Task<List<FactionDomain>> HandleAsync(Guid dmUserId);
}

public class GetFactionLibraryQueryHandler(
    IFactionReadRepository factionReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetFactionLibraryQueryHandler
{
    public async Task<List<FactionDomain>> HandleAsync(Guid dmUserId)
    {
        var factions = await factionReadRepository.GetAllByDmAsync(dmUserId);

        var options = new ParallelOptions { MaxDegreeOfParallelism = 4 };
        Parallel.ForEach(factions, options, faction =>
        {
            var imageKey = imageKeyCreator.Create(faction.DmUserId, faction.FactionId, EntityType.Faction);
            faction.ImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
        });

        return factions;
    }
}

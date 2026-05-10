using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Faction;

public interface IGetFactionLibraryQueryHandler
{
    Task<List<FactionDomain>> HandleAsync(Guid dmUserId);
}

public class GetFactionLibraryQueryHandler(
    IFactionReadRepository factionReadRepository) : IGetFactionLibraryQueryHandler
{
    public async Task<List<FactionDomain>> HandleAsync(Guid dmUserId)
    {
        return await factionReadRepository.GetAllByDmAsync(dmUserId);
    }
}

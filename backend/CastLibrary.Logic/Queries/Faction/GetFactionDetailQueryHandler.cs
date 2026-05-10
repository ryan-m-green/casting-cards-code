using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Faction;

public interface IGetFactionDetailQueryHandler
{
    Task<FactionDomain> HandleAsync(Guid factionId);
}

public class GetFactionDetailQueryHandler(
    IFactionReadRepository factionReadRepository) : IGetFactionDetailQueryHandler
{
    public async Task<FactionDomain> HandleAsync(Guid factionId)
    {
        return await factionReadRepository.GetByIdAsync(factionId);
    }
}

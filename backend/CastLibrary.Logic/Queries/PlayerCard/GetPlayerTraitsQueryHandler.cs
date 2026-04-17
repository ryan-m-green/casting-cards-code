using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.PlayerCard;

public interface IGetPlayerTraitsQueryHandler
{
    Task<List<PlayerCardTraitDomain>> HandleAsync(Guid playerCardId);
}

public class GetPlayerTraitsQueryHandler(
    IPlayerCardTraitReadRepository traitReadRepository) : IGetPlayerTraitsQueryHandler
{
    public Task<List<PlayerCardTraitDomain>> HandleAsync(Guid playerCardId)
        => traitReadRepository.GetByPlayerCardAsync(playerCardId);
}

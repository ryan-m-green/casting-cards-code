using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.PlayerCard;

public interface IGetPlayerCastPerceptionsQueryHandler
{
    Task<List<PlayerCastPerceptionDomain>> HandleAsync(Guid playerCardId);
}

public class GetPlayerCastPerceptionsQueryHandler(
    IPlayerCastPerceptionReadRepository perceptionReadRepository) : IGetPlayerCastPerceptionsQueryHandler
{
    public Task<List<PlayerCastPerceptionDomain>> HandleAsync(Guid playerCardId)
        => perceptionReadRepository.GetByPlayerCardAsync(playerCardId);
}

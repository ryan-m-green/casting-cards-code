using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.PlayerCard;

public interface IGetPlayerMemoriesQueryHandler
{
    Task<List<PlayerCardMemoryDomain>> HandleAsync(Guid playerCardId);
}

public class GetPlayerMemoriesQueryHandler(
    IPlayerCardMemoryReadRepository memoryReadRepository) : IGetPlayerMemoriesQueryHandler
{
    public Task<List<PlayerCardMemoryDomain>> HandleAsync(Guid playerCardId)
        => memoryReadRepository.GetByPlayerCardAsync(playerCardId);
}

using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.PlayerCard;

public interface IGetPlayerConditionsQueryHandler
{
    Task<List<PlayerCardConditionDomain>> HandleAsync(Guid playerCardId);
}

public class GetPlayerConditionsQueryHandler(
    IPlayerCardConditionReadRepository conditionReadRepository) : IGetPlayerConditionsQueryHandler
{
    public Task<List<PlayerCardConditionDomain>> HandleAsync(Guid playerCardId)
        => conditionReadRepository.GetByPlayerCardAsync(playerCardId);
}

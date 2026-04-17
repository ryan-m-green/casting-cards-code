using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.PlayerCard;

public interface IGetCastInstancePerceptionsQueryHandler
{
    Task<List<PlayerCastPerceptionDomain>> HandleAsync(Guid castInstanceId);
}

public class GetCastInstancePerceptionsQueryHandler(
    IPlayerCastPerceptionReadRepository perceptionReadRepository) : IGetCastInstancePerceptionsQueryHandler
{
    public Task<List<PlayerCastPerceptionDomain>> HandleAsync(Guid castInstanceId)
        => perceptionReadRepository.GetByCastInstanceAsync(castInstanceId);
}

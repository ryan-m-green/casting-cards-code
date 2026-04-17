using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.PlayerCard;

public interface IGetPlayerSecretsQueryHandler
{
    Task<List<PlayerCardSecretDomain>> HandleAsync(Guid playerCardId);
}

public class GetPlayerSecretsQueryHandler(
    IPlayerCardSecretReadRepository secretReadRepository) : IGetPlayerSecretsQueryHandler
{
    public Task<List<PlayerCardSecretDomain>> HandleAsync(Guid playerCardId)
        => secretReadRepository.GetByPlayerCardAsync(playerCardId);
}

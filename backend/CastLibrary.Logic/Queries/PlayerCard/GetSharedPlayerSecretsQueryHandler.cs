using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.PlayerCard;

public interface IGetSharedPlayerSecretsQueryHandler
{
    Task<List<PlayerCardSecretDomain>> HandleAsync(Guid playerCardId);
}

public class GetSharedPlayerSecretsQueryHandler(
    IPlayerCardSecretReadRepository secretReadRepository) : IGetSharedPlayerSecretsQueryHandler
{
    public async Task<List<PlayerCardSecretDomain>> HandleAsync(Guid playerCardId)
    {
        var secrets = await secretReadRepository.GetByPlayerCardAsync(playerCardId);
        return secrets.Where(s => s.IsShared).ToList();
    }
}

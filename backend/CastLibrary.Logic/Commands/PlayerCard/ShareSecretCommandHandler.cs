using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IShareSecretCommandHandler
{
    Task<PlayerCardSecretDomain?> HandleAsync(ShareSecretCommand command);
}

public class ShareSecretCommandHandler(
    IPlayerCardSecretReadRepository secretReadRepository,
    IPlayerCardSecretUpdateRepository secretUpdateRepository) : IShareSecretCommandHandler
{
    public async Task<PlayerCardSecretDomain?> HandleAsync(ShareSecretCommand command)
    {
        var secret = await secretReadRepository.GetByIdAsync(command.SecretId);
        if (secret is null || secret.PlayerCardId != command.PlayerCardId) return null;
        if (secret.IsShared) return secret;

        var sharedAt = DateTime.UtcNow;
        await secretUpdateRepository.ShareAsync(command.SecretId, command.SharedBy, sharedAt);

        secret.IsShared = true;
        secret.SharedBy = command.SharedBy;
        secret.SharedAt = sharedAt;
        return secret;
    }
}

public class ShareSecretCommand
{
    public ShareSecretCommand(Guid playerCardId, Guid secretId, string sharedBy)
    {
        PlayerCardId = playerCardId;
        SecretId = secretId;
        SharedBy = sharedBy;
    }

    public Guid PlayerCardId { get; }
    public Guid SecretId { get; }
    public string SharedBy { get; }
}

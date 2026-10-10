using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IUpdatePlayerCardSecretCommandHandler
{
    Task<PlayerCardSecretDomain> HandleAsync(UpdatePlayerCardSecretCommand command);
}

public class UpdatePlayerCardSecretCommandHandler(
    IPlayerCardSecretReadRepository secretReadRepository,
    IPlayerCardSecretUpdateRepository secretUpdateRepository) : IUpdatePlayerCardSecretCommandHandler
{
    public async Task<PlayerCardSecretDomain> HandleAsync(UpdatePlayerCardSecretCommand command)
    {
        var secret = await secretReadRepository.GetByIdAsync(command.SecretId);
        if (secret is null || secret.PlayerCardId != command.PlayerCardId) return null;

        secret.Content = command.Request.Content;
        await secretUpdateRepository.UpdateContentAsync(command.SecretId, command.Request.Content);

        return secret;
    }
}

public class UpdatePlayerCardSecretCommand
{
    public UpdatePlayerCardSecretCommand(Guid playerCardId, Guid secretId, UpdatePlayerCardSecretRequest request)
    {
        PlayerCardId = playerCardId;
        SecretId = secretId;
        Request = request;
    }

    public Guid PlayerCardId { get; }
    public Guid SecretId { get; }
    public UpdatePlayerCardSecretRequest Request { get; }
}

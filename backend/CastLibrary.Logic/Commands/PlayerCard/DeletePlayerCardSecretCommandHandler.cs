using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IDeletePlayerCardSecretCommandHandler
{
    Task<bool> HandleAsync(DeletePlayerCardSecretCommand command);
}

public class DeletePlayerCardSecretCommandHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardSecretReadRepository secretReadRepository,
    IPlayerCardSecretDeleteRepository secretDeleteRepository) : IDeletePlayerCardSecretCommandHandler
{
    public async Task<bool> HandleAsync(DeletePlayerCardSecretCommand command)
    {
        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.CampaignId != command.CampaignId) return false;

        var secret = await secretReadRepository.GetByIdAsync(command.SecretId);
        if (secret is null || secret.PlayerCardId != command.PlayerCardId) return false;

        await secretDeleteRepository.DeleteAsync(command.SecretId);
        return true;
    }
}

public class DeletePlayerCardSecretCommand
{
    public DeletePlayerCardSecretCommand(Guid playerCardId, Guid secretId, Guid campaignId)
    {
        PlayerCardId = playerCardId;
        SecretId     = secretId;
        CampaignId   = campaignId;
    }

    public Guid PlayerCardId { get; }
    public Guid SecretId     { get; }
    public Guid CampaignId   { get; }
}

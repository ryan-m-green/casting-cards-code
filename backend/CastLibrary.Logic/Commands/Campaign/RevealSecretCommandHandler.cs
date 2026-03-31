using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IRevealSecretCommandHandler
{
    Task<CampaignSecretDomain> HandleAsync(RevealSecretCommand command);
}
public class RevealSecretCommandHandler(
    ISecretReadRepository secretReadRepository,
    ISecretUpdateRepository secretUpdateRepository) : IRevealSecretCommandHandler
{
    public async Task<CampaignSecretDomain> HandleAsync(RevealSecretCommand command)
    {
        var secret = await secretReadRepository.GetByIdAsync(command.SecretId);
        if (secret is null || secret.CampaignId != command.CampaignId) return null;

        await secretUpdateRepository.RevealAsync(command.SecretId, DateTime.UtcNow);
        secret.IsRevealed = true;
        secret.RevealedAt = DateTime.UtcNow;
        return secret;
    }
}

public class RevealSecretCommand
{
    public RevealSecretCommand(Guid secretId, Guid campaignId)
    {
        SecretId = secretId;
        CampaignId = campaignId;
    }

    public Guid SecretId { get; }
    public Guid CampaignId { get; }
}

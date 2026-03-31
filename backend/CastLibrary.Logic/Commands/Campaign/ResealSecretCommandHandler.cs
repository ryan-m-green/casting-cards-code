using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IResealSecretCommandHandler
{
    Task<CampaignSecretDomain> HandleAsync(ResealSecretCommand command);
}
public class ResealSecretCommandHandler(
    ISecretReadRepository secretReadRepository,
    ISecretUpdateRepository secretUpdateRepository) : IResealSecretCommandHandler
{
    public async Task<CampaignSecretDomain> HandleAsync(ResealSecretCommand command)
    {
        var secret = await secretReadRepository.GetByIdAsync(command.SecretId);
        if (secret is null || secret.CampaignId != command.CampaignId) return null;

        await secretUpdateRepository.ResealAsync(command.SecretId);
        secret.IsRevealed = false;
        secret.RevealedAt = null;
        return secret;
    }
}

public class ResealSecretCommand
{
    public ResealSecretCommand(Guid secretId, Guid campaignId)
    {
        SecretId = secretId;
        CampaignId = campaignId;
    }
    public Guid SecretId { get; }
    public Guid CampaignId { get; }
}
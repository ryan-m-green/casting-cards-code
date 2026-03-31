using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteCampaignSecretCommandHandler
{
    Task<bool> HandleAsync(DeleteCampaignSecretCommand command);
}
public class DeleteCampaignSecretCommandHandler(
    ISecretReadRepository secretReadRepository,
    ISecretDeleteRepository secretDeleteRepository) : IDeleteCampaignSecretCommandHandler
{
    public async Task<bool> HandleAsync(DeleteCampaignSecretCommand command)
    {
        var secret = await secretReadRepository.GetByIdAsync(command.SecretId);
        if (secret is null || secret.CampaignId != command.CampaignId) return false;

        await secretDeleteRepository.DeleteAsync(command.SecretId);
        return true;
    }
}

public class DeleteCampaignSecretCommand
{
    public DeleteCampaignSecretCommand(Guid secretId, Guid campaignId)
    {
        SecretId = secretId;
        CampaignId = campaignId;
    }
    public Guid SecretId { get; }
    public Guid CampaignId { get; }
}
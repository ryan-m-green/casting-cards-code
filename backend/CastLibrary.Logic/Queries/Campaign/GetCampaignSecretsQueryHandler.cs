using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignSecretsQueryHandler
{
    Task<List<CampaignSecretDomain>> HandleAsync(Guid campaignId, Guid? secretId = null);
}

public class GetCampaignSecretsQueryHandler(
    ISecretReadRepository secretReadRepository) : IGetCampaignSecretsQueryHandler
{
    public async Task<List<CampaignSecretDomain>> HandleAsync(Guid campaignId, Guid? secretId = null)
    {
        List<CampaignSecretDomain> secrets;
        
        if (secretId.HasValue)
        {
            var secret = await secretReadRepository.GetByIdAsync(secretId.Value);
            if (secret is null || secret.CampaignId != campaignId) return [];
            
            secrets = new List<CampaignSecretDomain> { secret };
        }
        else
        {
            secrets = await secretReadRepository.GetByCampaignAsync(campaignId);
        }
        
        return secrets;
    }
}
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignDetailQueryHandler
{
    Task<(CampaignDomain Campaign, List<CampaignCityInstanceDomain> Cities,
        List<CampaignCastInstanceDomain> Casts, List<CampaignLocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets, List<CampaignCastRelationshipDomain> Relationships,
        List<CampaignPlayerDomain> Players, CampaignInviteCodeDomain? InviteCode)>
        HandleAsync(Guid campaignId);
}

public class GetCampaignDetailQueryHandler(
    ICampaignReadRepository campaignRepository,
    ISecretReadRepository secretReadRepository,
    ICampaignCastRelationshipReadRepository relationshipRepository,
    ICampaignPlayerReadRepository playerReadRepository,
    IGetCampaignInviteCodeQueryHandler getInviteCodeQuery) : IGetCampaignDetailQueryHandler
{
    public async Task<(CampaignDomain Campaign, List<CampaignCityInstanceDomain> Cities,
        List<CampaignCastInstanceDomain> Casts, List<CampaignLocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets, List<CampaignCastRelationshipDomain> Relationships,
        List<CampaignPlayerDomain> Players, CampaignInviteCodeDomain? InviteCode)>
        HandleAsync(Guid campaignId)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign is null) return (null, [], [], [], [], [], [], null);

        var cities = await campaignRepository.GetCityInstancesByCampaignAsync(campaignId);
        var casts = await campaignRepository.GetCastInstancesByCampaignAsync(campaignId);
        var locations = await campaignRepository.GetLocationInstancesByCampaignAsync(campaignId);
        var secrets = await secretReadRepository.GetByCampaignAsync(campaignId);
        var relationships = await relationshipRepository.GetByCampaignAsync(campaignId);
        var players = await playerReadRepository.GetByCampaignAsync(campaignId);
        var inviteCode = await getInviteCodeQuery.HandleAsync(campaignId);

        return (campaign, cities, casts, locations, secrets, relationships, players, inviteCode);
    }
}

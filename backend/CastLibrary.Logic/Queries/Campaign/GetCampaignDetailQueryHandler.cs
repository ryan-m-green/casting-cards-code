using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignDetailQueryHandler
{
    Task<(CampaignDomain Campaign, List<CampaignLocationInstanceDomain> locations,
        List<CampaignCastInstanceDomain> Casts, List<CampaignSublocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets, List<CampaignCastRelationshipDomain> Relationships,
        List<CampaignPlayerDomain> Players, CampaignInviteCodeDomain InviteCode,
        TimeOfDayDomain? TimeOfDay)>
        HandleAsync(Guid campaignId);
}

public class GetCampaignDetailQueryHandler(
    ICampaignReadRepository campaignRepository,
    ISecretReadRepository secretReadRepository,
    ICampaignCastRelationshipReadRepository relationshipRepository,
    ICampaignPlayerReadRepository playerReadRepository,
    IGetCampaignInviteCodeQueryHandler getInviteCodeQuery,
    ITimeOfDayReadRepository timeOfDayRepository) : IGetCampaignDetailQueryHandler
{
    public async Task<(CampaignDomain Campaign, List<CampaignLocationInstanceDomain> locations,
        List<CampaignCastInstanceDomain> Casts, List<CampaignSublocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets, List<CampaignCastRelationshipDomain> Relationships,
        List<CampaignPlayerDomain> Players, CampaignInviteCodeDomain InviteCode,
        TimeOfDayDomain? TimeOfDay)>
        HandleAsync(Guid campaignId)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign is null) return (null, [], [], [], [], [], [], null, null);

        var locations = await campaignRepository.GetLocationInstancesByCampaignAsync(campaignId);
        var casts = await campaignRepository.GetCastInstancesByCampaignAsync(campaignId);
        var subLocations = await campaignRepository.GetSublocationInstancesByCampaignAsync(campaignId);
        var secrets = await secretReadRepository.GetByCampaignAsync(campaignId);
        var relationships = await relationshipRepository.GetByCampaignAsync(campaignId);
        var players = await playerReadRepository.GetByCampaignAsync(campaignId);
        var inviteCode = await getInviteCodeQuery.HandleAsync(campaignId);
        var timeOfDay = await timeOfDayRepository.GetByCampaignIdAsync(campaignId);

        return (campaign, locations, casts, subLocations, secrets, relationships, players, inviteCode, timeOfDay);
    }
}



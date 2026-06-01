using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignDetailQueryHandler
{
    Task<(CampaignDomain Campaign, List<CampaignLocationInstanceDomain> locations,
        List<CampaignCastInstanceDomain> Casts, List<CampaignSublocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets, List<CampaignCastRelationshipDomain> Relationships,
        List<CampaignPlayerDomain> Players, CampaignInviteCodeDomain InviteCode,
        TimeOfDayDomain TimeOfDay, List<CampaignFactionInstanceDomain> Factions)>
        HandleAsync(Guid campaignId);
}

public class GetCampaignDetailQueryHandler(
    ICampaignReadRepository campaignRepository,
    ISecretReadRepository secretReadRepository,
    ICampaignCastRelationshipReadRepository relationshipRepository,
    ICampaignPlayerReadRepository playerReadRepository,
    IGetCampaignInviteCodeQueryHandler getInviteCodeQuery,
    ITimeOfDayReadRepository timeOfDayRepository,
    IFilenameService filenameService) : IGetCampaignDetailQueryHandler
{
    public async Task<(CampaignDomain Campaign, List<CampaignLocationInstanceDomain> locations,
        List<CampaignCastInstanceDomain> Casts, List<CampaignSublocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets, List<CampaignCastRelationshipDomain> Relationships,
        List<CampaignPlayerDomain> Players, CampaignInviteCodeDomain InviteCode,
        TimeOfDayDomain TimeOfDay, List<CampaignFactionInstanceDomain> Factions)>
        HandleAsync(Guid campaignId)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign is null) return (null, [], [], [], [], [], [], null, null, []);

        var locations = await campaignRepository.GetLocationInstancesByCampaignAsync(campaignId);
        var casts = await campaignRepository.GetCastInstancesByCampaignAsync(campaignId);
        var sublocations = await campaignRepository.GetSublocationInstancesByCampaignAsync(campaignId);
        var factions = await campaignRepository.GetFactionInstancesByCampaignAsync(campaignId, campaign.DmUserId);

        var secrets = await secretReadRepository.GetByCampaignAsync(campaignId);
        var relationships = await relationshipRepository.GetByCampaignAsync(campaignId);
        var players = await playerReadRepository.GetByCampaignAsync(campaignId);
        var inviteCode = await getInviteCodeQuery.HandleAsync(campaignId);
        var timeOfDay = await timeOfDayRepository.GetByCampaignIdAsync(campaignId);

        var locationBag = new ConcurrentBag<CampaignLocationInstanceDomain>(locations);
        var sublocationBag = new ConcurrentBag<CampaignSublocationInstanceDomain>(sublocations);
        var castsBag = new ConcurrentBag<CampaignCastInstanceDomain>(casts);
        var playersBag = new ConcurrentBag<CampaignPlayerDomain>(players);

        filenameService.AddImageUrls(campaign.DmUserId, campaignId, locationBag, sublocationBag, castsBag, playersBag);

        return (campaign, locationBag.ToList(), castsBag.ToList(), 
            sublocationBag.ToList(), secrets, relationships, playersBag.ToList(), 
            inviteCode, timeOfDay, factions);
    }
}



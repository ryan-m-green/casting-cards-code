using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetPlayerCampaignDetailQueryHandler
{
    Task<(CampaignDomain Campaign, List<CampaignLocationInstanceDomain> locations,
        List<CampaignCastInstanceDomain> Casts, List<CampaignSublocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets, TimeOfDayDomain TimeOfDay, List<CampaignPlayerDomain> Players, List<CampaignFactionInstanceDomain> Factions)>
        HandleAsync(Guid campaignId);
}

public class GetPlayerCampaignDetailQueryHandler(
    ICampaignReadRepository campaignRepository,
    ISecretReadRepository secretReadRepository,
    ITimeOfDayReadRepository timeOfDayRepository,
    ICampaignPlayerReadRepository playerReadRepository,
    IFilenameService filenameService) : IGetPlayerCampaignDetailQueryHandler
{
    public async Task<(CampaignDomain Campaign, List<CampaignLocationInstanceDomain> locations,
        List<CampaignCastInstanceDomain> Casts, List<CampaignSublocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets, TimeOfDayDomain TimeOfDay, List<CampaignPlayerDomain> Players, List<CampaignFactionInstanceDomain> Factions)>
        HandleAsync(Guid campaignId)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign is null) return (null, [], [], [], [], null, [], []);

        var locations = (await campaignRepository.GetLocationInstancesByCampaignAsync(campaignId))
                            .Where(c => c.IsVisibleToPlayers)
                            .ToList();

        var visibleLocationIds = locations.Select(c => c.InstanceId).ToHashSet();

        // The party's own room is the players' own, and it is kept here by its own name rather than by
        // the visibility of the location it stands in: a campaign's locations leave the party's
        // location out (see GetLocationInstancesByCampaignAsync — what is handed over is the places in
        // the campaign, the party's own among nothing), so an anchor tested against the locations a
        // player can see was never handed to them at all. It is kept whether its own card is locked or
        // not, as the room the party stands in is the players' own; every other room still has to be
        // one they can see, standing in a location they can see. The v2 shell's party panel gathers
        // the cast cards travelling with the party under this anchor, so a read without it is a party
        // area with no companions in it — for players, and for nobody else.
        var sublocations = (await campaignRepository.GetPlayerSublocationInstancesByCampaignAsync(campaignId))
                            .Where(l => l.IsPartyAnchor
                                || (l.IsVisibleToPlayers && l.LocationInstanceId.HasValue
                                    && visibleLocationIds.Contains(l.LocationInstanceId.Value)))
                            .ToList();

        var visibleSublocationIds = sublocations.Select(l => l.InstanceId).ToHashSet();

        var casts = (await campaignRepository.GetPlayerCastInstancesByCampaignAsync(campaignId))
                            .Where(c => c.IsVisibleToPlayers)
                            .Select(c => { c.Description = string.Empty; return c; })
                            .ToList();

        var visibleCastIds = casts.Select(c => c.InstanceId).ToHashSet();

        var secrets = (await secretReadRepository.GetByCampaignAsync(campaignId))
                            .Where(s => s.IsRevealed
                                && ((s.LocationInstanceId.HasValue && visibleLocationIds.Contains(s.LocationInstanceId.Value))
                                    || (s.CastInstanceId.HasValue && visibleCastIds.Contains(s.CastInstanceId.Value))
                                    || (s.SublocationInstanceId.HasValue && visibleSublocationIds.Contains(s.SublocationInstanceId.Value))))
                            .ToList();

        var timeOfDay = await timeOfDayRepository.GetByCampaignIdAsync(campaignId);

        var players = await playerReadRepository.GetByCampaignAsync(campaignId);

        var factions = await campaignRepository.GetFactionInstancesForPlayerAsync(campaignId);

        var locationBag = new ConcurrentBag<CampaignLocationInstanceDomain>(locations);
        var sublocationBag = new ConcurrentBag<CampaignSublocationInstanceDomain>(sublocations);
        var castBag = new ConcurrentBag<CampaignCastInstanceDomain>(casts);
        var playerBag = new ConcurrentBag<CampaignPlayerDomain>(players);

        filenameService.AddImageUrls(campaign.DmUserId, campaignId, locationBag, sublocationBag, castBag, playerBag);
        filenameService.AddWorldMapImageUrl(campaign.DmUserId, campaignId, campaign);

        return (campaign, locationBag.ToList(), castBag.ToList(), sublocationBag.ToList(), secrets, timeOfDay, playerBag.ToList(), factions);
    }
}




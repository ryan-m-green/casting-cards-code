using Amazon.Runtime.Internal.Util;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
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

        var sublocations = (await campaignRepository.GetPlayerSublocationInstancesByCampaignAsync(campaignId))
                            .Where(l => l.IsVisibleToPlayers && l.LocationInstanceId.HasValue && visibleLocationIds.Contains(l.LocationInstanceId.Value))
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

        return (campaign, locationBag.ToList(), castBag.ToList(), sublocationBag.ToList(), secrets, timeOfDay, playerBag.ToList(), factions);
    }
}




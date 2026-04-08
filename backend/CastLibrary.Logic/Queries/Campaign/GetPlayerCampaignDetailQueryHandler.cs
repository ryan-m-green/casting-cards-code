using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetPlayerCampaignDetailQueryHandler
{
    Task<(CampaignDomain Campaign, List<CampaignLocationInstanceDomain> locations,
        List<CampaignCastInstanceDomain> Casts, List<CampaignSublocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets)>
        HandleAsync(Guid campaignId);
}

public class GetPlayerCampaignDetailQueryHandler(
    ICampaignReadRepository campaignRepository,
    ISecretReadRepository secretReadRepository) : IGetPlayerCampaignDetailQueryHandler
{
    public async Task<(CampaignDomain Campaign, List<CampaignLocationInstanceDomain> locations,
        List<CampaignCastInstanceDomain> Casts, List<CampaignSublocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets)>
        HandleAsync(Guid campaignId)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign is null) return (null, [], [], [], []);

        var locations = (await campaignRepository.GetLocationInstancesByCampaignAsync(campaignId))
                            .Where(c => c.IsVisibleToPlayers)
                            .ToList();

        var visibleLocationIds = locations.Select(c => c.InstanceId).ToHashSet();

        var sublocations = (await campaignRepository.GetSublocationInstancesByCampaignAsync(campaignId))
                            .Where(l => l.IsVisibleToPlayers && l.LocationInstanceId.HasValue && visibleLocationIds.Contains(l.LocationInstanceId.Value))
                            .ToList();

        var visibleSublocationIds = sublocations.Select(l => l.InstanceId).ToHashSet();

        var casts = (await campaignRepository.GetCastInstancesByCampaignAsync(campaignId))
                            .Where(c => c.IsVisibleToPlayers
                                && c.LocationInstanceId.HasValue && visibleLocationIds.Contains(c.LocationInstanceId.Value)
                                && (!c.SublocationInstanceId.HasValue || visibleSublocationIds.Contains(c.SublocationInstanceId.Value)))
                            .Select(c => { c.Description = string.Empty; return c; })
                            .ToList();

        var visibleCastIds = casts.Select(c => c.InstanceId).ToHashSet();

        var secrets = (await secretReadRepository.GetByCampaignAsync(campaignId))
                            .Where(s => s.IsRevealed
                                && ((s.LocationInstanceId.HasValue && visibleLocationIds.Contains(s.LocationInstanceId.Value))
                                    || (s.CastInstanceId.HasValue && visibleCastIds.Contains(s.CastInstanceId.Value))
                                    || (s.SublocationInstanceId.HasValue && visibleSublocationIds.Contains(s.SublocationInstanceId.Value))))
                            .ToList();

        return (campaign, locations, casts, sublocations, secrets);
    }
}




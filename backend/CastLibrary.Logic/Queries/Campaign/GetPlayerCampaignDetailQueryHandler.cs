using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetPlayerCampaignDetailQueryHandler
{
    Task<(CampaignDomain Campaign, List<CampaignCityInstanceDomain> Cities,
        List<CampaignCastInstanceDomain> Casts, List<CampaignSublocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets)>
        HandleAsync(Guid campaignId);
}

public class GetPlayerCampaignDetailQueryHandler(
    ICampaignReadRepository campaignRepository,
    ISecretReadRepository secretReadRepository) : IGetPlayerCampaignDetailQueryHandler
{
    public async Task<(CampaignDomain Campaign, List<CampaignCityInstanceDomain> Cities,
        List<CampaignCastInstanceDomain> Casts, List<CampaignSublocationInstanceDomain> Locations,
        List<CampaignSecretDomain> Secrets)>
        HandleAsync(Guid campaignId)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign is null) return (null, [], [], [], []);

        var cities = (await campaignRepository.GetCityInstancesByCampaignAsync(campaignId))
                            .Where(c => c.IsVisibleToPlayers)
                            .ToList();

        var visibleCityIds = cities.Select(c => c.InstanceId).ToHashSet();

        var locations = (await campaignRepository.GetSublocationInstancesByCampaignAsync(campaignId))
                            .Where(l => l.IsVisibleToPlayers && l.CityInstanceId.HasValue && visibleCityIds.Contains(l.CityInstanceId.Value))
                            .ToList();

        var visibleLocationIds = locations.Select(l => l.InstanceId).ToHashSet();

        var casts = (await campaignRepository.GetCastInstancesByCampaignAsync(campaignId))
                            .Where(c => c.IsVisibleToPlayers
                                && c.CityInstanceId.HasValue && visibleCityIds.Contains(c.CityInstanceId.Value)
                                && (!c.SublocationInstanceId.HasValue || visibleLocationIds.Contains(c.SublocationInstanceId.Value)))
                            .Select(c => { c.Description = string.Empty; return c; })
                            .ToList();

        var visibleCastIds = casts.Select(c => c.InstanceId).ToHashSet();

        var secrets = (await secretReadRepository.GetByCampaignAsync(campaignId))
                            .Where(s => s.IsRevealed
                                && ((s.CityInstanceId.HasValue && visibleCityIds.Contains(s.CityInstanceId.Value))
                                    || (s.CastInstanceId.HasValue && visibleCastIds.Contains(s.CastInstanceId.Value))))
                            .ToList();

        return (campaign, cities, casts, locations, secrets);
    }
}

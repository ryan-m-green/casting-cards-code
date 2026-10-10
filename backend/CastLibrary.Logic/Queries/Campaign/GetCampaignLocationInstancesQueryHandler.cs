using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignLocationInstancesQueryHandler
{
    Task<List<CampaignLocationInstanceDomain>> HandleAsync(Guid campaignId, Guid? locationInstanceId = null);
}

public class GetCampaignLocationInstancesQueryHandler(
    ICampaignReadRepository campaignRepository,
    IFilenameService filenameService) : IGetCampaignLocationInstancesQueryHandler
{
    public async Task<List<CampaignLocationInstanceDomain>> HandleAsync(Guid campaignId, Guid? locationInstanceId = null)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign is null) return [];

        List<CampaignLocationInstanceDomain> locations;
        
        if (locationInstanceId.HasValue)
        {
            var location = await campaignRepository.GetLocationInstanceByIdAsync(locationInstanceId.Value);
            if (location is null || location.CampaignId != campaignId) return [];
            
            locations = new List<CampaignLocationInstanceDomain> { location };
        }
        else
        {
            locations = await campaignRepository.GetLocationInstancesByCampaignAsync(campaignId);
        }
        
        var locationBag = new ConcurrentBag<CampaignLocationInstanceDomain>(locations);
        
        // Add image URLs to match the existing behavior
        filenameService.AddImageUrls(campaign.DmUserId, campaignId, locationBag, [], [], []);
        
        // Sort locations alphabetically by name
        return locationBag.OrderBy(l => l.Name).ToList();
    }
}
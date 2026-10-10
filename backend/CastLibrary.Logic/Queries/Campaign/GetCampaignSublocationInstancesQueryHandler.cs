using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignSublocationInstancesQueryHandler
{
    Task<List<CampaignSublocationInstanceDomain>> HandleAsync(Guid campaignId, Guid? sublocationInstanceId = null);
}

public class GetCampaignSublocationInstancesQueryHandler(
    ICampaignReadRepository campaignRepository,
    IFilenameService filenameService) : IGetCampaignSublocationInstancesQueryHandler
{
    public async Task<List<CampaignSublocationInstanceDomain>> HandleAsync(Guid campaignId, Guid? sublocationInstanceId = null)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign is null) return [];

        List<CampaignSublocationInstanceDomain> sublocations;
        
        if (sublocationInstanceId.HasValue)
        {
            var sublocation = await campaignRepository.GetSublocationInstanceByIdAsync(sublocationInstanceId.Value);
            if (sublocation is null || sublocation.CampaignId != campaignId) return [];
            
            sublocations = new List<CampaignSublocationInstanceDomain> { sublocation };
        }
        else
        {
            sublocations = await campaignRepository.GetSublocationInstancesByCampaignAsync(campaignId);
        }
        
        var sublocationBag = new ConcurrentBag<CampaignSublocationInstanceDomain>(sublocations);
        
        // Add image URLs to match the existing behavior
        filenameService.AddImageUrls(campaign.DmUserId, campaignId, [], sublocationBag, [], []);
        
        // Sort sublocations alphabetically by name
        return sublocationBag.OrderBy(s => s.Name).ToList();
    }
}
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignCastInstancesQueryHandler
{
    Task<List<CampaignCastInstanceDomain>> HandleAsync(Guid campaignId, Guid? castInstanceId = null);
}

public class GetCampaignCastInstancesQueryHandler(
    ICampaignReadRepository campaignRepository,
    IFilenameService filenameService) : IGetCampaignCastInstancesQueryHandler
{
    public async Task<List<CampaignCastInstanceDomain>> HandleAsync(Guid campaignId, Guid? castInstanceId = null)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign is null) return [];

        List<CampaignCastInstanceDomain> casts;
        
        if (castInstanceId.HasValue)
        {
            var cast = await campaignRepository.GetCastInstanceByIdAsync(castInstanceId.Value);
            if (cast is null || cast.CampaignId != campaignId) return [];
            
            casts = new List<CampaignCastInstanceDomain> { cast };
        }
        else
        {
            casts = await campaignRepository.GetCastInstancesByCampaignAsync(campaignId);
        }
        
        var castBag = new ConcurrentBag<CampaignCastInstanceDomain>(casts);
        
        // Add image URLs to match the existing behavior
        filenameService.AddImageUrls(campaign.DmUserId, campaignId, [], [], castBag, []);
        
        return castBag.ToList();
    }
}
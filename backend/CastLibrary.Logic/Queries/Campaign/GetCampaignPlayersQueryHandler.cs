using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignPlayersQueryHandler
{
    Task<List<CampaignPlayerDomain>> HandleAsync(Guid campaignId, Guid? playerUserId = null);
}

public class GetCampaignPlayersQueryHandler(
    ICampaignPlayerReadRepository playerReadRepository,
    IFilenameService filenameService) : IGetCampaignPlayersQueryHandler
{
    public async Task<List<CampaignPlayerDomain>> HandleAsync(Guid campaignId, Guid? playerUserId = null)
    {
        List<CampaignPlayerDomain> players;
        
        if (playerUserId.HasValue)
        {
            var player = await playerReadRepository.GetByUserAndCampaignAsync(campaignId, playerUserId.Value);
            if (player is null) return [];
            
            players = new List<CampaignPlayerDomain> { player };
        }
        else
        {
            players = await playerReadRepository.GetByCampaignAsync(campaignId);
        }
        
        var playerBag = new ConcurrentBag<CampaignPlayerDomain>(players);
        
        // Add image URLs to match the existing behavior
        filenameService.AddImageUrls(Guid.Empty, campaignId, [], [], [], playerBag);
        
        return playerBag.ToList();
    }
}
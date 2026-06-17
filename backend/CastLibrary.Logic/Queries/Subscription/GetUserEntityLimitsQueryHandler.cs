using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Queries.Subscription;
public interface IGetUserEntityLimitsQueryHandler
{
    Task<EntityLimitsResponse> HandleAsync(GetUserEntityLimitsQuery query);
}
public class GetUserEntityLimitsQueryHandler(
    ISubscriptionLimitService subscriptionLimitService,
    ICampaignReadRepository campaignRepository,
    ILocationReadRepository locationRepository,
    ISublocationReadRepository sublocationRepository,
    ICastReadRepository castRepository,
    IFactionReadRepository factionRepository) : IGetUserEntityLimitsQueryHandler
{
    public async Task<EntityLimitsResponse> HandleAsync(GetUserEntityLimitsQuery query)
    {
        var limits = await subscriptionLimitService.GetLimitsForUserAsync(query.UserId);
        
        var campaignCount = (await campaignRepository.GetAllByDmAsync(query.UserId)).Count;
        var locationCount = (await locationRepository.GetAllByDmAsync(query.UserId)).Count;
        var sublocationCount = (await sublocationRepository.GetAllByDmAsync(query.UserId)).Count;
        var castCount = (await castRepository.GetAllByDmAsync(query.UserId)).Count;
        var factionCount = (await factionRepository.GetAllByDmAsync(query.UserId)).Count;

        return new EntityLimitsResponse
        {
            Campaigns = new EntityLimitInfo
            {
                CurrentCount = campaignCount,
                Limit = limits.Campaigns,
                LimitReached = limits.Campaigns != -1 && campaignCount >= limits.Campaigns
            },
            Locations = new EntityLimitInfo
            {
                CurrentCount = locationCount,
                Limit = limits.Locations,
                LimitReached = limits.Locations != -1 && locationCount >= limits.Locations
            },
            Sublocations = new EntityLimitInfo
            {
                CurrentCount = sublocationCount,
                Limit = limits.Sublocations,
                LimitReached = limits.Sublocations != -1 && sublocationCount >= limits.Sublocations
            },
            Factions = new EntityLimitInfo
            {
                CurrentCount = factionCount,
                Limit = limits.Factions,
                LimitReached = limits.Factions != -1 && factionCount >= limits.Factions
            },
            Cast = new EntityLimitInfo
            {
                CurrentCount = castCount,
                Limit = limits.Cast,
                LimitReached = limits.Cast != -1 && castCount >= limits.Cast
            }
        };
    }
}

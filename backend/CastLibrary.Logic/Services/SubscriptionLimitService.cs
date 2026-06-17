using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Exceptions;

namespace CastLibrary.Logic.Services;

public interface ISubscriptionLimitService
{
    Task<SubscriptionLimits> GetLimitsForUserAsync(Guid userId);
    Task CheckLimitAsync(Guid userId, string entityType);
}

public class SubscriptionLimitService(
    ISubscriptionReadRepository subscriptionRepository,
    ICastcardsConfigurationReadRepository configurationRepository,
    ICampaignReadRepository campaignRepository,
    ILocationReadRepository locationRepository,
    ISublocationReadRepository sublocationRepository,
    ICastReadRepository castRepository,
    IFactionReadRepository factionRepository) : ISubscriptionLimitService
{
    public async Task<SubscriptionLimits> GetLimitsForUserAsync(Guid userId)
    {
        var subscription = await subscriptionRepository.GetByUserIdAsync(userId);
        
        if (subscription is null)
        {
            throw new InvalidOperationException("Subscription not found for user");
        }

        if (subscription.BypassPayment)
        {
            return new SubscriptionLimits
            {
                Campaigns = -1,
                Locations = -1,
                Sublocations = -1,
                Factions = -1,
                Cast = -1
            };
        }

        var config = await configurationRepository.GetSubscriptionLimitsAsync<SubscriptionLimitsConfig>();
        
        if (config is null)
        {
            throw new InvalidOperationException("Subscription limits configuration not found");
        }

        return subscription.Status switch
        {
            SubscriptionStatus.FreeTrial => config.FreeTrial,
            SubscriptionStatus.Active => config.Paid,
            _ => config.FreeTrial
        };
    }

    public async Task CheckLimitAsync(Guid userId, string entityType)
    {
        var limits = await GetLimitsForUserAsync(userId);
        
        int currentCount = entityType.ToLower() switch
        {
            "campaign" => (await campaignRepository.GetAllByDmAsync(userId)).Count,
            "location" => (await locationRepository.GetAllByDmAsync(userId)).Count,
            "sublocation" => (await sublocationRepository.GetAllByDmAsync(userId)).Count,
            "cast" => (await castRepository.GetAllByDmAsync(userId)).Count,
            "faction" => (await factionRepository.GetAllByDmAsync(userId)).Count,
            _ => throw new ArgumentException($"Unknown entity type: {entityType}")
        };

        int limit = entityType.ToLower() switch
        {
            "campaign" => limits.Campaigns,
            "location" => limits.Locations,
            "sublocation" => limits.Sublocations,
            "cast" => limits.Cast,
            "faction" => limits.Factions,
            _ => throw new ArgumentException($"Unknown entity type: {entityType}")
        };

        if (limit == -1)
        {
            return;
        }

        if (currentCount >= limit)
        {
            throw new LimitExceededException();
        }
    }
}

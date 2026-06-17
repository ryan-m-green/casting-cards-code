using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Queries.Admin;

public interface IGetPricingDisplayQueryHandler
{
    Task<PricingDisplayResponse> HandleAsync();
}

public class GetPricingDisplayQueryHandler(IPricingModelReadRepository pricingModelReadRepository, ICastcardsConfigurationReadRepository configurationReadRepository) : IGetPricingDisplayQueryHandler
{
    public async Task<PricingDisplayResponse> HandleAsync()
    {
        var allPricing = await pricingModelReadRepository.GetAllPricingModelsAsync();

        var activePrice = allPricing.FirstOrDefault(o => o.IsActive && o.ModelName != "V1");

        var v1Model = allPricing.FirstOrDefault(o => o.ModelName == "V1");

        var subscriptionLimits = await configurationReadRepository.GetSubscriptionLimitsAsync<SubscriptionLimits>();

        return new PricingDisplayResponse
        {
            Active = activePrice == null ? null : new PricingDisplay()
            {
                PriceInCents = activePrice.PriceInCents,
                ModelName = activePrice.ModelName,
                StripePriceId = activePrice.StripePriceId
            },
            V1 = new PricingDisplay()
            {
                PriceInCents = v1Model.PriceInCents,
                ModelName = v1Model.ModelName,
                StripePriceId = v1Model.StripePriceId
            },
            SubscriptionLimits = subscriptionLimits
        };
    }
}

namespace CastLibrary.Shared.Responses;

public class PricingDisplayResponse
{
    public PricingDisplay V1 { get; set; }
    public PricingDisplay Active { get; set; }
    public SubscriptionLimits SubscriptionLimits { get; set; }
}

public class PricingDisplay
{
    public string ModelName { get; set; } = string.Empty;
    public int PriceInCents { get; set; }
    public string StripePriceId { get; set; } = string.Empty;
}

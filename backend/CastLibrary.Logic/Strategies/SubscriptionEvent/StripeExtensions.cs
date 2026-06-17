using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Strategies.SubscriptionEvent;

public static class StripeExtensions
{
    public static SubscriptionStatus MapStripeStatus(this string stripeStatus)
    {
        return stripeStatus.ToLowerInvariant() switch
        {
            "trialing" => SubscriptionStatus.Active,
            "active" => SubscriptionStatus.Active,
            "past_due" => SubscriptionStatus.PastDue,
            "canceled" => SubscriptionStatus.Canceled,
            "unpaid" => SubscriptionStatus.PastDue,
            "incomplete" => SubscriptionStatus.PaymentActionRequired,
            "incomplete_expired" => SubscriptionStatus.Canceled,
            "paused" => SubscriptionStatus.Paused,
            _ => SubscriptionStatus.Active
        };
    }
}

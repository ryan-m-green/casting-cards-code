using Stripe;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Strategies.SubscriptionEvent;

public class SubscriptionPausedStrategy : ISubscriptionEventStrategy
{
    public string EventType => "customer.subscription.paused";

    public void ProcessAsync(Subscription subscription, SubscriptionDomain existingSubscription)
    {
        existingSubscription.Status = SubscriptionStatus.Paused;
    }
}

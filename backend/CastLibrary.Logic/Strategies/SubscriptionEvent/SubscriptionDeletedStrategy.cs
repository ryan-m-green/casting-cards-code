using Stripe;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Strategies.SubscriptionEvent;

public class SubscriptionDeletedStrategy : ISubscriptionEventStrategy
{
    public string EventType => "customer.subscription.deleted";

    public void ProcessAsync(Subscription subscription, SubscriptionDomain existingSubscription)
    {
        existingSubscription.Status = SubscriptionStatus.Canceled;
    }
}

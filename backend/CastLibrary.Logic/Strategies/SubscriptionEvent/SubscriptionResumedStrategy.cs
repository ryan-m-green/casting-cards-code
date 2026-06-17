using Stripe;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Strategies.SubscriptionEvent;

public class SubscriptionResumedStrategy : ISubscriptionEventStrategy
{
    public string EventType => "customer.subscription.resumed";

    public void ProcessAsync(Subscription subscription, SubscriptionDomain existingSubscription)
    {
        existingSubscription.Status = SubscriptionStatus.Active;
        existingSubscription.LockLevel = LockLevel.FullAccess;
        existingSubscription.PastDueSince = null;
    }
}

using Stripe;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Strategies.SubscriptionEvent;

public class SubscriptionCreatedStrategy : ISubscriptionEventStrategy
{
    public string EventType => "customer.subscription.created";

    public void ProcessAsync(Subscription subscription, SubscriptionDomain existingSubscription)
    {
        existingSubscription.Status = SubscriptionStatus.Active;
        existingSubscription.LockLevel = LockLevel.FullAccess;
    }
}

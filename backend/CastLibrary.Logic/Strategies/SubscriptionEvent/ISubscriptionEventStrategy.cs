using Stripe;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Strategies.SubscriptionEvent;

public interface ISubscriptionEventStrategy
{
    string EventType { get; }
    void ProcessAsync(Subscription subscription, SubscriptionDomain existingSubscription);
}

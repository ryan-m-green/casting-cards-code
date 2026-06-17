using Stripe;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Strategies.SubscriptionEvent;

public class SubscriptionEventStrategyFactory
{
    private readonly IEnumerable<ISubscriptionEventStrategy> _strategies;

    public SubscriptionEventStrategyFactory(IEnumerable<ISubscriptionEventStrategy> strategies)
    {
        _strategies = strategies;
    }

    public void ProcessSubscriptionEventAsync(string eventType, Subscription subscription, SubscriptionDomain existingSubscription)
    {
        var strategy = _strategies.FirstOrDefault(s => s.EventType.Equals(eventType, StringComparison.OrdinalIgnoreCase));
        if (strategy == null)
        {
            throw new ArgumentException($"Unknown subscription event type: {eventType}");
        }
        strategy.ProcessAsync(subscription, existingSubscription);
    }
}

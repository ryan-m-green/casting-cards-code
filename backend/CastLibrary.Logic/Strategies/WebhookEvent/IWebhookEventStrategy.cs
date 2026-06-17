using CastLibrary.Shared.Domain;
using Stripe;

namespace CastLibrary.Logic.Strategies.WebhookEvent;

public interface IWebhookEventStrategy
{
    bool IsMatch(string eventType);
    Task HandleAsync(StripeEventPayload stripeEvent);
}

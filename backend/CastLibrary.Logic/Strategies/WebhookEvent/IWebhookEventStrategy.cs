using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Strategies.WebhookEvent;

public interface IWebhookEventStrategy
{
    bool IsMatch(string eventType);
    Task HandleAsync(StripeEventPayload stripeEvent);
}

using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Stripe;
public class ProcessStripeWebhookCommand
{
    public ProcessStripeWebhookCommand(StripeEventPayload eventPayload)
    {
        EventPayload = eventPayload;
    }
    public StripeEventPayload EventPayload { get; }
}

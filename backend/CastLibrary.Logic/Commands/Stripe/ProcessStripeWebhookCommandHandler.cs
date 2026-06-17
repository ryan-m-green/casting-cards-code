using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Strategies.WebhookEvent;

namespace CastLibrary.Logic.Commands.Stripe;

public interface IProcessStripeWebhookCommandHandler
{
    Task HandleAsync(ProcessStripeWebhookCommand command);
}

public class ProcessStripeWebhookCommandHandler(
    ILoggingService loggingService,
    IEnumerable<IWebhookEventStrategy> webhookEventStrategies) : IProcessStripeWebhookCommandHandler
{
    public async Task HandleAsync(ProcessStripeWebhookCommand command)
    {
        if (command.EventPayload == null) return;

        var strategy = webhookEventStrategies.FirstOrDefault(s => s.IsMatch(command.EventPayload.Type));
        if (strategy != null)
        {
            await strategy.HandleAsync(command.EventPayload);
        }
        else
        {
            loggingService.LogInformation($"No matching strategy found for webhook event {command.EventPayload.Type}");
        }
    }
}

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
        loggingService.LogInformation("ProcessStripeWebhookCommandHandler: Entry - Processing webhook command");
        try
        {
            if (command.EventPayload == null)
            {
                loggingService.LogWarning("ProcessStripeWebhookCommandHandler: Exit - Event payload is null");
                return;
            }

            var eventType = command.EventPayload.Type;
            loggingService.LogInformation($"ProcessStripeWebhookCommandHandler: Looking for strategy for event type {eventType}");

            var strategy = webhookEventStrategies.FirstOrDefault(s => s.IsMatch(eventType));
            if (strategy != null)
            {
                var strategyName = strategy.GetType().Name;
                loggingService.LogInformation($"ProcessStripeWebhookCommandHandler: Selected strategy {strategyName} for event type {eventType}");
                await strategy.HandleAsync(command.EventPayload);
                loggingService.LogInformation($"ProcessStripeWebhookCommandHandler: Strategy {strategyName} completed successfully");
            }
            else
            {
                loggingService.LogInformation($"ProcessStripeWebhookCommandHandler: No matching strategy found for webhook event {eventType}");
            }

            loggingService.LogInformation("ProcessStripeWebhookCommandHandler: Exit - Webhook command processing completed");
        }
        catch (Exception ex)
        {
            loggingService.LogError($"ProcessStripeWebhookCommandHandler: Exit - Error processing webhook command: {ex.Message}");
            throw;
        }
    }
}

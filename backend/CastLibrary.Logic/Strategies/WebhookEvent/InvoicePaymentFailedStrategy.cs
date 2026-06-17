using Stripe;
using CastLibrary.Adapter.Services;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using Newtonsoft.Json.Linq;

namespace CastLibrary.Logic.Strategies.WebhookEvent;

/// <summary>
/// Stripe Event: invoice.payment_failed
/// Fires when an invoice payment attempt fails
/// This fires for each retry attempt (Stripe retries 3-4 times by default)
/// Strategy is idempotent - only updates if subscription not already past_due
/// </summary>
public class InvoicePaymentFailedStrategy : IWebhookEventStrategy
{
    private readonly ISubscriptionReadRepository _subscriptionReadRepository;
    private readonly ISubscriptionUpdateRepository _subscriptionUpdateRepository;
    private readonly ILoggingService _loggingService;
    private readonly IStripeService _stripeService;

    public InvoicePaymentFailedStrategy(
        ISubscriptionReadRepository subscriptionReadRepository,
        ISubscriptionUpdateRepository subscriptionUpdateRepository,
        ILoggingService loggingService,
        IStripeService stripeService)
    {
        _subscriptionReadRepository = subscriptionReadRepository;
        _subscriptionUpdateRepository = subscriptionUpdateRepository;
        _loggingService = loggingService;
        _stripeService = stripeService;
    }

    private string EventType => "invoice.payment_failed";

    public async Task HandleAsync(StripeEventPayload stripeEvent)
    {
        _loggingService.LogInformation($"InvoicePaymentFailedStrategy: Processing webhook event {stripeEvent.Id}");
        try
        {
            var invoiceObject = stripeEvent.Data["object"] as JObject;
            var customerId = invoiceObject?["customer"]?.ToString();
            var subscriptionId = invoiceObject?["subscription"]?.ToString();
            
            _loggingService.LogInformation($"InvoicePaymentFailedStrategy: Stripe event data: {stripeEvent.Data}");
            if (string.IsNullOrEmpty(customerId))
            {
                _loggingService.LogWarning($"InvoicePaymentFailedStrategy: Could not extract CustomerId from webhook event {stripeEvent.Id}");
                return;
            }

            var subscription = await _subscriptionReadRepository.GetByStripeCustomerIdAsync(customerId);
            if (subscription == null)
            {
                _loggingService.LogWarning($"InvoicePaymentFailedStrategy: No subscription found for CustomerId {customerId}");
                return;
            }

            if (subscription.Status == SubscriptionStatus.PastDue && subscription.PastDueSince.HasValue)
            {
                _loggingService.LogInformation($"InvoicePaymentFailedStrategy: Subscription {subscription.Id} already marked as PastDue since {subscription.PastDueSince.Value}. Recalculating lock level.");
                var lockLevel = _stripeService.CalculateLockLevel(subscription.PastDueSince.Value);
                subscription.LockLevel = lockLevel;
                await _subscriptionUpdateRepository.UpdateAsync(subscription);
                return;
            }

            subscription.Status = SubscriptionStatus.PastDue;
            subscription.PastDueSince = DateTime.UtcNow;
            subscription.LockLevel = _stripeService.CalculateLockLevel(subscription.PastDueSince.Value);

            if (!string.IsNullOrEmpty(subscriptionId))
            {
                subscription.StripeSubscriptionId = subscriptionId;
            }

            await _subscriptionUpdateRepository.UpdateAsync(subscription);
            var userId = stripeEvent.UserId == Guid.Empty ? subscription.UserId : stripeEvent.UserId;
            stripeEvent.Callback(userId, subscription.LockLevel.ToString());
            _loggingService.LogInformation($"InvoicePaymentFailedStrategy: Successfully updated subscription {subscription.Id} for CustomerId {customerId} to PastDue with LockLevel {subscription.LockLevel}");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"InvoicePaymentFailedStrategy: Error processing webhook event {stripeEvent.Id}: {ex.Message}");
        }
    }

    public bool IsMatch(string eventType)
    {
        return eventType == EventType;
    }
}

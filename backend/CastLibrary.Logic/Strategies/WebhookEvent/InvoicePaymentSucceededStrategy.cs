using Stripe;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using Newtonsoft.Json.Linq;

namespace CastLibrary.Logic.Strategies.WebhookEvent;

/// <summary>
/// Stripe Event: invoice.payment_succeeded
/// Fires when an invoice payment attempt succeeds
/// This indicates successful payment for a subscription billing period
/// </summary>
public class InvoicePaymentSucceededStrategy : IWebhookEventStrategy
{
    private readonly ISubscriptionReadRepository _subscriptionReadRepository;
    private readonly ISubscriptionUpdateRepository _subscriptionUpdateRepository;
    private readonly ILoggingService _loggingService;

    public InvoicePaymentSucceededStrategy(
        ISubscriptionReadRepository subscriptionReadRepository,
        ISubscriptionUpdateRepository subscriptionUpdateRepository,
        ILoggingService loggingService)
    {
        _subscriptionReadRepository = subscriptionReadRepository;
        _subscriptionUpdateRepository = subscriptionUpdateRepository;
        _loggingService = loggingService;
    }

    private string EventType => "invoice.payment_succeeded";

    public async Task HandleAsync(StripeEventPayload stripeEvent)
    {
        _loggingService.LogInformation($"InvoicePaymentSucceededStrategy: Entry - Processing webhook event {stripeEvent.Id}");
        try
        {
            var invoiceObject = stripeEvent.Data["object"] as JObject;
            var customerId = invoiceObject?["customer"]?.ToString();
            
            _loggingService.LogInformation($"InvoicePaymentSucceededStrategy: Stripe event data: {stripeEvent.Data}");
            if (string.IsNullOrEmpty(customerId))
            {
                _loggingService.LogWarning($"InvoicePaymentSucceededStrategy: Exit - Could not extract CustomerId from webhook event {stripeEvent.Id}");
                return;
            }

            var subscription = await _subscriptionReadRepository.GetByStripeCustomerIdAsync(customerId);
            if (subscription == null)
            {
                _loggingService.LogWarning($"InvoicePaymentSucceededStrategy: Exit - No subscription found for CustomerId {customerId}");
                return;
            }

            subscription.Status = SubscriptionStatus.Active;
            subscription.LockLevel = LockLevel.FullAccess;
            subscription.PastDueSince = null;

            var subscriptionId = invoiceObject?["subscription"]?.ToString();
            if (!string.IsNullOrEmpty(subscriptionId))
            {
                subscription.StripeSubscriptionId = subscriptionId;
            }

            await _subscriptionUpdateRepository.UpdateAsync(subscription);
            var userId = stripeEvent.UserId == Guid.Empty ? subscription.UserId : stripeEvent.UserId;
            stripeEvent.Callback(userId, subscription.LockLevel.ToString());
            _loggingService.LogInformation($"InvoicePaymentSucceededStrategy: Successfully updated subscription {subscription.Id} for CustomerId {customerId} to Active");
            _loggingService.LogInformation($"InvoicePaymentSucceededStrategy: Exit - Successfully processed webhook event {stripeEvent.Id}");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"InvoicePaymentSucceededStrategy: Exit - Error processing webhook event {stripeEvent.Id}: {ex.Message}");
        }
    }

    public bool IsMatch(string eventType)
    {
        return eventType == EventType;
    }
}

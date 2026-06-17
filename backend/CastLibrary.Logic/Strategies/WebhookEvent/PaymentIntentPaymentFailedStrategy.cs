using Stripe;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using Newtonsoft.Json.Linq;

namespace CastLibrary.Logic.Strategies.WebhookEvent;

/// <summary>
/// Stripe Event: payment_intent.payment_failed
/// Fires when a payment intent fails
/// This indicates payment failure for one-time payments or initial subscription payments
/// </summary>
public class PaymentIntentPaymentFailedStrategy : IWebhookEventStrategy
{
    private readonly ISubscriptionReadRepository _subscriptionReadRepository;
    private readonly ISubscriptionUpdateRepository _subscriptionUpdateRepository;
    private readonly ILoggingService _loggingService;

    public PaymentIntentPaymentFailedStrategy(
        ISubscriptionReadRepository subscriptionReadRepository,
        ISubscriptionUpdateRepository subscriptionUpdateRepository,
        ILoggingService loggingService)
    {
        _subscriptionReadRepository = subscriptionReadRepository;
        _subscriptionUpdateRepository = subscriptionUpdateRepository;
        _loggingService = loggingService;
    }

    private string EventType => "payment_intent.payment_failed";

    public async Task HandleAsync(StripeEventPayload stripeEvent)
    {
        _loggingService.LogInformation($"PaymentIntentPaymentFailedStrategy: Processing webhook event {stripeEvent.Id}");
        try
        {
            var paymentIntentObject = stripeEvent.Data["object"] as JObject;
            var customerId = paymentIntentObject?["customer"]?.ToString();
            var paymentIntentId = paymentIntentObject?["id"]?.ToString();
            
            _loggingService.LogInformation($"PaymentIntentPaymentFailedStrategy: Stripe event data: {stripeEvent.Data}");
            if (string.IsNullOrEmpty(customerId))
            {
                _loggingService.LogWarning($"PaymentIntentPaymentFailedStrategy: Could not extract CustomerId from webhook event {stripeEvent.Id}");
                return;
            }

            var subscription = await _subscriptionReadRepository.GetByStripeCustomerIdAsync(customerId);
            if (subscription == null)
            {
                _loggingService.LogWarning($"PaymentIntentPaymentFailedStrategy: No subscription found for CustomerId {customerId}");
                return;
            }

            subscription.Status = SubscriptionStatus.PastDue;
            subscription.PastDueSince = DateTime.UtcNow;
            subscription.LockLevel = LockLevel.SoftLock;

            _loggingService.LogInformation($"PaymentIntentPaymentFailedStrategy: PaymentIntent {paymentIntentId} processed. Invoice property no longer available in Stripe API 2025-03-31.basil - subscription ID not updated from this event.");

            await _subscriptionUpdateRepository.UpdateAsync(subscription);
            var userId = stripeEvent.UserId == Guid.Empty ? subscription.UserId : stripeEvent.UserId;
            stripeEvent.Callback(userId, subscription.LockLevel.ToString());
            _loggingService.LogInformation($"PaymentIntentPaymentFailedStrategy: Successfully updated subscription {subscription.Id} for CustomerId {customerId} to PastDue with SoftLock");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"PaymentIntentPaymentFailedStrategy: Error processing webhook event {stripeEvent.Id}: {ex.Message}");
        }
    }

    public bool IsMatch(string eventType)
    {
        return eventType == EventType;
    }
}

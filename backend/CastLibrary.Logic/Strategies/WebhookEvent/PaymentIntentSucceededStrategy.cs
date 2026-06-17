using Stripe;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using Newtonsoft.Json.Linq;

namespace CastLibrary.Logic.Strategies.WebhookEvent;

/// <summary>
/// Stripe Event: payment_intent.succeeded
/// Fires when a payment intent succeeds
/// This indicates successful payment for one-time payments or initial subscription payments
/// </summary>
public class PaymentIntentSucceededStrategy : IWebhookEventStrategy
{
    private readonly ISubscriptionReadRepository _subscriptionReadRepository;
    private readonly ISubscriptionUpdateRepository _subscriptionUpdateRepository;
    private readonly ILoggingService _loggingService;

    public PaymentIntentSucceededStrategy(
        ISubscriptionReadRepository subscriptionReadRepository,
        ISubscriptionUpdateRepository subscriptionUpdateRepository,
        ILoggingService loggingService)
    {
        _subscriptionReadRepository = subscriptionReadRepository;
        _subscriptionUpdateRepository = subscriptionUpdateRepository;
        _loggingService = loggingService;
    }

    private string EventType => "payment_intent.succeeded";

    public async Task HandleAsync(StripeEventPayload stripeEvent)
    {
        _loggingService.LogInformation($"PaymentIntentSucceededStrategy: Processing webhook event {stripeEvent.Id}");
        try
        {
            var paymentIntentObject = stripeEvent.Data["object"] as JObject;
            var customerId = paymentIntentObject?["customer"]?.ToString();
            var paymentIntentId = paymentIntentObject?["id"]?.ToString();
            
            _loggingService.LogInformation($"PaymentIntentSucceededStrategy: Stripe event data: {stripeEvent.Data}");
            if (string.IsNullOrEmpty(customerId))
            {
                _loggingService.LogWarning($"PaymentIntentSucceededStrategy: Could not extract CustomerId from webhook event {stripeEvent.Id}");
                return;
            }

            var subscription = await _subscriptionReadRepository.GetByStripeCustomerIdAsync(customerId);
            if (subscription == null)
            {
                _loggingService.LogWarning($"PaymentIntentSucceededStrategy: No subscription found for CustomerId {customerId}");
                return;
            }

            subscription.Status = SubscriptionStatus.Active;
            subscription.LockLevel = LockLevel.FullAccess;
            subscription.PastDueSince = null;
            subscription.StripeCustomerId = customerId;

            _loggingService.LogInformation($"PaymentIntentSucceededStrategy: PaymentIntent {paymentIntentId} processed. Invoice property no longer available in Stripe API 2025-03-31.basil - subscription ID not updated from this event.");

            await _subscriptionUpdateRepository.UpdateAsync(subscription);
            _loggingService.LogInformation($"PaymentIntentSucceededStrategy: Successfully updated subscription {subscription.Id} for CustomerId {customerId} to Active");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"PaymentIntentSucceededStrategy: Error processing webhook event {stripeEvent.Id}: {ex.Message}");
        }
    }

    public bool IsMatch(string eventType)
    {
        return eventType == EventType;
    }
}

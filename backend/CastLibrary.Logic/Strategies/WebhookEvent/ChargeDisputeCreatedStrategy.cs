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
/// Stripe Event: charge.dispute.created
/// Fires when a customer disputes a charge with their bank
/// This indicates a payment dispute that may result in funds being withdrawn
/// </summary>
public class ChargeDisputeCreatedStrategy : IWebhookEventStrategy
{
    private readonly ISubscriptionReadRepository _subscriptionReadRepository;
    private readonly ISubscriptionUpdateRepository _subscriptionUpdateRepository;
    private readonly ILoggingService _loggingService;
    private readonly IStripeService _stripeService;

    public ChargeDisputeCreatedStrategy(
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

    private string EventType => "charge.dispute.created";

    public async Task HandleAsync(StripeEventPayload stripeEvent)
    {
        _loggingService.LogInformation($"ChargeDisputeCreatedStrategy: Processing webhook event {stripeEvent.Id}");
        try
        {
            var dispute = stripeEvent.Data["object"].ToObject<Dispute>();
            _loggingService.LogInformation($"ChargeDisputeCreatedStrategy: Stripe event data: {stripeEvent.Data}");
            if (dispute?.Charge == null)
            {
                _loggingService.LogWarning($"ChargeDisputeCreatedStrategy: Could not extract Charge from webhook event {stripeEvent.Id}");
                return;
            }

            var charge = await _stripeService.GetChargeAsync(dispute.Charge.Id);
            if (charge?.Customer == null)
            {
                _loggingService.LogWarning($"ChargeDisputeCreatedStrategy: Could not extract CustomerId from charge {dispute.Charge.Id}");
                return;
            }

            var subscription = await _subscriptionReadRepository.GetByStripeCustomerIdAsync(charge.Customer.Id);
            if (subscription == null)
            {
                _loggingService.LogWarning($"ChargeDisputeCreatedStrategy: No subscription found for CustomerId {charge.Customer.Id}");
                return;
            }

            subscription.LockLevel = LockLevel.HardLock;
            subscription.Status = SubscriptionStatus.PaymentActionRequired;
            subscription.PastDueSince = DateTime.UtcNow;

            await _subscriptionUpdateRepository.UpdateAsync(subscription);
            var userId = stripeEvent.UserId == Guid.Empty ? subscription.UserId : stripeEvent.UserId;
            stripeEvent.Callback(userId, subscription.LockLevel.ToString());
            _loggingService.LogInformation($"ChargeDisputeCreatedStrategy: Successfully updated subscription {subscription.Id} for CustomerId {charge.Customer.Id} to HardLock due to dispute");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"ChargeDisputeCreatedStrategy: Error processing webhook event {stripeEvent.Id}: {ex.Message}");
        }
    }

    public bool IsMatch(string eventType)
    {
        return eventType == EventType;
    }
}

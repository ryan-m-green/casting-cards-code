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
/// Stripe Event: charge.dispute.closed
/// Fires when a dispute is closed (won, lost, or withdrawn)
/// If dispute is won, restore lock level based on current payment status
/// </summary>
public class ChargeDisputeClosedStrategy : IWebhookEventStrategy
{
    private readonly ISubscriptionReadRepository _subscriptionReadRepository;
    private readonly ISubscriptionUpdateRepository _subscriptionUpdateRepository;
    private readonly ILoggingService _loggingService;
    private readonly IStripeService _stripeService;

    public ChargeDisputeClosedStrategy(
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

    private string EventType => "charge.dispute.closed";

    public async Task HandleAsync(StripeEventPayload stripeEvent)
    {
        _loggingService.LogInformation($"ChargeDisputeClosedStrategy: Entry - Processing webhook event {stripeEvent.Id}");
        try
        {
            var dispute = stripeEvent.Data["object"].ToObject<Dispute>();
            _loggingService.LogInformation($"ChargeDisputeClosedStrategy: Stripe event data: {stripeEvent.Data}");
            if (dispute?.Charge == null)
            {
                _loggingService.LogWarning($"ChargeDisputeClosedStrategy: Exit - Could not extract Charge from webhook event {stripeEvent.Id}");
                return;
            }

            var charge = await _stripeService.GetChargeAsync(dispute.Charge.Id);
            if (charge?.Customer == null)
            {
                _loggingService.LogWarning($"ChargeDisputeClosedStrategy: Exit - Could not extract CustomerId from charge {dispute.Charge.Id}");
                return;
            }

            var subscription = await _subscriptionReadRepository.GetByStripeCustomerIdAsync(charge.Customer.Id);
            if (subscription == null)
            {
                _loggingService.LogWarning($"ChargeDisputeClosedStrategy: Exit - No subscription found for CustomerId {charge.Customer.Id}");
                return;
            }

            var status = dispute.Status;
            
            if (status == "won")
            {
                // Dispute won - charge stands, restore lock level based on current payment status
                if (subscription.PastDueSince.HasValue)
                {
                    subscription.LockLevel = _stripeService.CalculateLockLevel(subscription.PastDueSince.Value);
                }
                else
                {
                    subscription.LockLevel = LockLevel.FullAccess;
                    subscription.Status = SubscriptionStatus.Active;
                    subscription.PastDueSince = null;
                }

                await _subscriptionUpdateRepository.UpdateAsync(subscription);
                _loggingService.LogInformation($"ChargeDisputeClosedStrategy: Dispute won - restored subscription {subscription.Id} lock level to {subscription.LockLevel}");
            }
            else if (status == "lost")
            {
                // Dispute lost - charge reversed, ensure subscription is locked for manual review
                if (subscription.LockLevel != LockLevel.HardLock)
                {
                    subscription.LockLevel = LockLevel.HardLock;
                    await _subscriptionUpdateRepository.UpdateAsync(subscription);
                    _loggingService.LogInformation($"ChargeDisputeClosedStrategy: Dispute lost - set subscription {subscription.Id} to HardLock for manual review");
                }
                else
                {
                    _loggingService.LogInformation($"ChargeDisputeClosedStrategy: Dispute lost - subscription {subscription.Id} already at HardLock");
                }
            }
            else
            {
                _loggingService.LogInformation($"ChargeDisputeClosedStrategy: Dispute closed with status {status}, no lock level change for subscription {subscription.Id}");
            }
            var userId = stripeEvent.UserId == Guid.Empty ? subscription.UserId : stripeEvent.UserId;
            stripeEvent.Callback(userId, subscription.LockLevel.ToString());
            _loggingService.LogInformation($"ChargeDisputeClosedStrategy: Exit - Successfully processed webhook event {stripeEvent.Id}");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"ChargeDisputeClosedStrategy: Exit - Error processing webhook event {stripeEvent.Id}: {ex.Message}");
        }
    }

    public bool IsMatch(string eventType)
    {
        return eventType == EventType;
    }
}

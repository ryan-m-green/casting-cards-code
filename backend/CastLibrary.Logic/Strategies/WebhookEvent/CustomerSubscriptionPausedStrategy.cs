using Stripe;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using Newtonsoft.Json.Linq;
using System.Linq;

namespace CastLibrary.Logic.Strategies.WebhookEvent;

/// <summary>
/// Stripe Event: customer.subscription.paused
/// Fires when a subscription's status changes to paused
/// Only applies when subscriptions enter status=paused, not when payment collection is paused
/// </summary>
public class CustomerSubscriptionPausedStrategy : IWebhookEventStrategy
{
    private readonly ISubscriptionReadRepository _subscriptionReadRepository;
    private readonly ISubscriptionUpdateRepository _subscriptionUpdateRepository;
    private readonly ILoggingService _loggingService;

    public CustomerSubscriptionPausedStrategy(
        ISubscriptionReadRepository subscriptionReadRepository,
        ISubscriptionUpdateRepository subscriptionUpdateRepository,
        ILoggingService loggingService)
    {
        _subscriptionReadRepository = subscriptionReadRepository;
        _subscriptionUpdateRepository = subscriptionUpdateRepository;
        _loggingService = loggingService;
    }

    private string EventType => "customer.subscription.paused";

    public async Task HandleAsync(StripeEventPayload stripeEvent)
    {
        _loggingService.LogInformation($"CustomerSubscriptionPausedStrategy: Entry - Processing webhook event {stripeEvent.Id}");
        try
        {
            var subscriptionObject = stripeEvent.Data["object"] as JObject;
            var customerId = subscriptionObject?["customer"]?.ToString();
            
            _loggingService.LogInformation($"CustomerSubscriptionPausedStrategy: Stripe event data: {stripeEvent.Data}");
            if (string.IsNullOrEmpty(customerId))
            {
                _loggingService.LogWarning($"CustomerSubscriptionPausedStrategy: Exit - Could not extract CustomerId from webhook event {stripeEvent.Id}");
                return;
            }

            var subscription = await _subscriptionReadRepository.GetByStripeCustomerIdAsync(customerId);
            if (subscription == null)
            {
                _loggingService.LogWarning($"CustomerSubscriptionPausedStrategy: Exit - No subscription found for CustomerId {customerId}");
                return;
            }

            subscription.Status = SubscriptionStatus.Paused;
            subscription.LockLevel = LockLevel.HardLock;
            
            var currentPeriodEnd = subscriptionObject?["items"]?["data"]?[0]?["current_period_end"]?.ToObject<long>();
            if (currentPeriodEnd.HasValue)
            {
                subscription.CurrentPeriodEnd = DateTimeOffset.FromUnixTimeSeconds(currentPeriodEnd.Value).DateTime;
            }

            await _subscriptionUpdateRepository.UpdateAsync(subscription);
            var userId = stripeEvent.UserId == Guid.Empty ? subscription.UserId : stripeEvent.UserId;
            stripeEvent.Callback(userId, subscription.LockLevel.ToString());
            _loggingService.LogInformation($"CustomerSubscriptionPausedStrategy: Successfully updated subscription {subscription.Id} for CustomerId {customerId} to Paused with HardLock");
            _loggingService.LogInformation($"CustomerSubscriptionPausedStrategy: Exit - Successfully processed webhook event {stripeEvent.Id}");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"CustomerSubscriptionPausedStrategy: Exit - Error processing webhook event {stripeEvent.Id}: {ex.Message}");
        }
    }

    public bool IsMatch(string eventType)
    {
        return eventType == EventType;
    }
}

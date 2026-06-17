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
/// Stripe Event: customer.subscription.deleted
/// Fires when a customer's subscription is canceled and expires (at the end of the billing period)
/// or is immediately canceled by the merchant
/// </summary>
public class CustomerSubscriptionDeletedStrategy : IWebhookEventStrategy
{
    private readonly ISubscriptionReadRepository _subscriptionReadRepository;
    private readonly ISubscriptionUpdateRepository _subscriptionUpdateRepository;
    private readonly ILoggingService _loggingService;

    public CustomerSubscriptionDeletedStrategy(
        ISubscriptionReadRepository subscriptionReadRepository,
        ISubscriptionUpdateRepository subscriptionUpdateRepository,
        ILoggingService loggingService)
    {
        _subscriptionReadRepository = subscriptionReadRepository;
        _subscriptionUpdateRepository = subscriptionUpdateRepository;
        _loggingService = loggingService;
    }

    private string EventType => "customer.subscription.deleted";

    public async Task HandleAsync(StripeEventPayload stripeEvent)
    {
        _loggingService.LogInformation($"CustomerSubscriptionDeletedStrategy: Processing webhook event {stripeEvent.Id}");
        try
        {
            var subscriptionObject = stripeEvent.Data["object"] as JObject;
            var customerId = subscriptionObject?["customer"]?.ToString();
            
            _loggingService.LogInformation($"CustomerSubscriptionDeletedStrategy: Stripe event data: {stripeEvent.Data}");
            if (string.IsNullOrEmpty(customerId))
            {
                _loggingService.LogWarning($"CustomerSubscriptionDeletedStrategy: Could not extract CustomerId from webhook event {stripeEvent.Id}");
                return;
            }

            var subscription = await _subscriptionReadRepository.GetByStripeCustomerIdAsync(customerId);
            if (subscription == null)
            {
                _loggingService.LogWarning($"CustomerSubscriptionDeletedStrategy: No subscription found for CustomerId {customerId}");
                return;
            }

            subscription.Status = SubscriptionStatus.Canceled;
            subscription.LockLevel = LockLevel.Suspended;
            
            var currentPeriodEnd = subscriptionObject?["items"]?["data"]?[0]?["current_period_end"]?.ToObject<long>();
            if (currentPeriodEnd.HasValue)
            {
                subscription.CurrentPeriodEnd = DateTimeOffset.FromUnixTimeSeconds(currentPeriodEnd.Value).DateTime;
            }

            await _subscriptionUpdateRepository.UpdateAsync(subscription);
            var userId = stripeEvent.UserId == Guid.Empty ? subscription.UserId : stripeEvent.UserId;
            stripeEvent.Callback(userId, subscription.LockLevel.ToString());
            _loggingService.LogInformation($"CustomerSubscriptionDeletedStrategy: Successfully updated subscription {subscription.Id} for CustomerId {customerId} to Canceled");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"CustomerSubscriptionDeletedStrategy: Error processing webhook event {stripeEvent.Id}: {ex.Message}");
        }
    }

    public bool IsMatch(string eventType)
    {
        return eventType == EventType;
    }
}

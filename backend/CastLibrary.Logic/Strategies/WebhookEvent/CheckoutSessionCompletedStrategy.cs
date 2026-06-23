using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Strategies.WebhookEvent;

/// <summary>
/// Stripe Event: checkout.session.completed
/// Fires when a checkout session is completed successfully
/// This indicates the user has completed the payment flow and subscription should be activated
/// </summary>
public class CheckoutSessionCompletedStrategy : IWebhookEventStrategy
{
    private readonly ISubscriptionReadRepository _subscriptionReadRepository;
    private readonly ISubscriptionUpdateRepository _subscriptionUpdateRepository;
    private readonly IPricingModelReadRepository _pricingModelReadRepository;
    private readonly ILoggingService _loggingService;

    public CheckoutSessionCompletedStrategy(
        ISubscriptionReadRepository subscriptionReadRepository,
        ISubscriptionUpdateRepository subscriptionUpdateRepository,
        IPricingModelReadRepository pricingModelReadRepository,
        ILoggingService loggingService)
    {
        _subscriptionReadRepository = subscriptionReadRepository;
        _subscriptionUpdateRepository = subscriptionUpdateRepository;
        _pricingModelReadRepository = pricingModelReadRepository;
        _loggingService = loggingService;
    }

    private string EventType => "checkout.session.completed";

    public async Task HandleAsync(StripeEventPayload stripeEvent)
    {
        _loggingService.LogInformation($"CheckoutSessionCompletedStrategy: Entry - Processing webhook event {stripeEvent.Id}");
        try
        {
            var session = stripeEvent.Data["object"].ToObject<Stripe.Checkout.Session>();
            _loggingService.LogInformation($"CheckoutSessionCompletedStrategy: Stripe event data: {stripeEvent.Data}");
            if (session?.Metadata == null || !session.Metadata.TryGetValue("userId", out var userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            {
                _loggingService.LogWarning($"CheckoutSessionCompletedStrategy: Exit - Could not extract userId from webhook event {stripeEvent.Id}");
                return;
            }

            var subscription = await _subscriptionReadRepository.GetByUserIdAsync(userId);
            if (subscription == null)
            {
                _loggingService.LogWarning($"CheckoutSessionCompletedStrategy: Exit - No subscription found for userId {userId}");
                return;
            }
            subscription.CurrentPeriodEnd = session.ExpiresAt;
            subscription.StripeCustomerId = session.CustomerId;
            subscription.StripeSubscriptionId = session.SubscriptionId;
            subscription.Status = SubscriptionStatus.Active;
            subscription.LockLevel = LockLevel.FullAccess;
            subscription.PastDueSince = null;

            await _subscriptionUpdateRepository.UpdateAsync(subscription);
            _loggingService.LogInformation($"CheckoutSessionCompletedStrategy: Successfully updated subscription {subscription.Id} for userId {userId} to Active");

            userId = stripeEvent.UserId == Guid.Empty ? subscription.UserId : stripeEvent.UserId;
            stripeEvent.Callback(userId, subscription.LockLevel.ToString());
            _loggingService.LogInformation($"CheckoutSessionCompletedStrategy: Exit - Successfully processed webhook event {stripeEvent.Id}");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"CheckoutSessionCompletedStrategy: Exit - Error processing webhook event {stripeEvent.Id}: {ex.Message}");
        }
    }

    public bool IsMatch(string eventType)
    {
        return eventType == EventType;
    }
}

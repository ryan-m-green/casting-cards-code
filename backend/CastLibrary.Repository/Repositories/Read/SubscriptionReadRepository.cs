using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;
namespace CastLibrary.Repository.Repositories.Read;
public interface ISubscriptionReadRepository
{
    Task<SubscriptionDomain> GetByUserIdAsync(Guid userId);
    Task<SubscriptionDomain> GetByStripeCustomerIdAsync(string stripeCustomerId);
}
public class SubscriptionReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ISubscriptionEntityMapper mapper) : ISubscriptionReadRepository
{
    public async Task<SubscriptionDomain> GetByUserIdAsync(Guid userId)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<SubscriptionEntity>(
            @"SELECT id, user_id AS UserId, stripe_customer_id AS StripeCustomerId,
                     stripe_subscription_id AS StripeSubscriptionId, status,
                     pricing_model_id AS PricingModelId, bypass_payment AS BypassPayment,
                     current_period_end AS CurrentPeriodEnd, created_at AS CreatedAt,
                     past_due_since AS PastDueSince, lock_level AS LockLevel
              FROM subscriptions WHERE user_id = @UserId", new { UserId = userId });

        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<SubscriptionDomain> GetByStripeCustomerIdAsync(string stripeCustomerId)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<SubscriptionEntity>(
            @"SELECT id, user_id AS UserId, stripe_customer_id AS StripeCustomerId,
                     stripe_subscription_id AS StripeSubscriptionId, status,
                     pricing_model_id AS PricingModelId, bypass_payment AS BypassPayment,
                     current_period_end AS CurrentPeriodEnd, created_at AS CreatedAt,
                     past_due_since AS PastDueSince, lock_level AS LockLevel
              FROM subscriptions WHERE stripe_customer_id = @StripeCustomerId", new { StripeCustomerId = stripeCustomerId });
        return entity is null ? null : mapper.ToDomain(entity);
    }
}

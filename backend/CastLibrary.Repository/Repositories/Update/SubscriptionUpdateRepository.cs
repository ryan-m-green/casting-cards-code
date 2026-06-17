using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using Dapper;
namespace CastLibrary.Repository.Repositories.Update;
public interface ISubscriptionUpdateRepository
{
    Task<SubscriptionDomain> UpdateAsync(SubscriptionDomain subscription);
    Task UpdateSubscriptionByUserIdAsync(Guid userId, string status, bool bypassPayment, DateTime? currentPeriodEnd, string lockLevel);
}
public class SubscriptionUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ISubscriptionEntityMapper mapper) : ISubscriptionUpdateRepository
{
    public async Task<SubscriptionDomain> UpdateAsync(SubscriptionDomain subscription)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = mapper.ToEntity(subscription);
        await conn.ExecuteAsync(
            @"UPDATE subscriptions
              SET stripe_customer_id = @StripeCustomerId,
                  stripe_subscription_id = @StripeSubscriptionId,
                  status = @Status,
                  pricing_model_id = @PricingModelId,
                  current_period_end = @CurrentPeriodEnd,
                  past_due_since = @PastDueSince,
                  lock_level = @LockLevel
              WHERE id = @Id", entity);
        return subscription;
    }

    public async Task UpdateSubscriptionByUserIdAsync(Guid userId, string status, bool bypassPayment, DateTime? currentPeriodEnd, string lockLevel)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        await conn.ExecuteAsync(
            @"UPDATE subscriptions
              SET status = @Status,
                  bypass_payment = @BypassPayment,
                  current_period_end = @CurrentPeriodEnd,
                  lock_level = @LockLevel
              WHERE user_id = @UserId",
            new { UserId = userId, Status = status, BypassPayment = bypassPayment, CurrentPeriodEnd = currentPeriodEnd, LockLevel = lockLevel });
    }
}

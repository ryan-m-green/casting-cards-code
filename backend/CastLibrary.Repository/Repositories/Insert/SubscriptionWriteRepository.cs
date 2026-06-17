using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using Dapper;
namespace CastLibrary.Repository.Repositories.Insert;

public interface ISubscriptionWriteRepository
{
    Task<SubscriptionDomain> InsertAsync(SubscriptionDomain subscription);
    Task<SubscriptionDomain> UpdateAsync(SubscriptionDomain subscription);
}
public class SubscriptionWriteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ISubscriptionEntityMapper mapper) : ISubscriptionWriteRepository
{
    public async Task<SubscriptionDomain> InsertAsync(SubscriptionDomain subscription)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = mapper.ToEntity(subscription);
        await conn.ExecuteAsync(
            @"INSERT INTO subscriptions (id, user_id, status, pricing_model_id, stripe_customer_id, stripe_subscription_id, bypass_payment, created_at, past_due_since, lock_level)
              VALUES (@Id, @UserId, @Status, @PricingModelId, @StripeCustomerId, @StripeSubscriptionId, @BypassPayment, @CreatedAt, @PastDueSince, @LockLevel)", entity);
        return subscription;
    }

    public async Task<SubscriptionDomain> UpdateAsync(SubscriptionDomain subscription)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = mapper.ToEntity(subscription);
        await conn.ExecuteAsync(
            @"UPDATE subscriptions
              SET status = @Status,
                  pricing_model_id = @PricingModelId,
                  stripe_customer_id = @StripeCustomerId,
                  stripe_subscription_id = @StripeSubscriptionId,
                  bypass_payment = @BypassPayment,
                  current_period_end = @CurrentPeriodEnd,
                  past_due_since = @PastDueSince,
                  lock_level = @LockLevel
              WHERE id = @Id", entity);
        return subscription;
    }

}

using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
namespace CastLibrary.Logic.Queries.Subscription;
public interface IGetUserSubscriptionQueryHandler
{
    Task<SubscriptionDomain> HandleAsync(GetUserSubscriptionQuery query);
}
public class GetUserSubscriptionQueryHandler(
    ISubscriptionReadRepository subscriptionReadRepository) : IGetUserSubscriptionQueryHandler
{
    public async Task<SubscriptionDomain> HandleAsync(GetUserSubscriptionQuery query)
    {
        return await subscriptionReadRepository.GetByUserIdAsync(query.UserId);
    }
}

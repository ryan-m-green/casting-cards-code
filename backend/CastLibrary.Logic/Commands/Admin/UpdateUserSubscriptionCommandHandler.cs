using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Admin;

public interface IUpdateUserSubscriptionCommandHandler
{
    Task HandleAsync(Guid userId, UpdateUserSubscriptionRequest request);
}

public class UpdateUserSubscriptionCommandHandler(ISubscriptionUpdateRepository subscriptionRepository) : IUpdateUserSubscriptionCommandHandler
{
    public async Task HandleAsync(Guid userId, UpdateUserSubscriptionRequest request)
    {
        await subscriptionRepository.UpdateSubscriptionByUserIdAsync(userId, request.Status, request.BypassPayment, request.CurrentPeriodEnd, request.LockLevel);
    }
}

public class UpdateUserSubscriptionCommand
{
    public UpdateUserSubscriptionCommand(Guid userId, UpdateUserSubscriptionRequest request)
    {
        UserId = userId;
        Request = request;
    }

    public Guid UserId { get; }
    public UpdateUserSubscriptionRequest Request { get; }
}

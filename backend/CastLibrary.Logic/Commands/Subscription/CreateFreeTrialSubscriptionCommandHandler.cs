using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
namespace CastLibrary.Logic.Commands.Subscription;
public interface ICreateFreeTrialSubscriptionCommandHandler
{
    Task<SubscriptionDomain> HandleAsync(CreateFreeTrialSubscriptionCommand command);
}
public class CreateFreeTrialSubscriptionCommandHandler(
    ISubscriptionWriteRepository subscriptionWriteRepository,
    ISubscriptionReadRepository subscriptionReadRepository,
    IPricingModelReadRepository pricingModelReadRepository,
    ICastcardsConfigurationReadRepository configurationReadRepository) : ICreateFreeTrialSubscriptionCommandHandler
{
    public async Task<SubscriptionDomain> HandleAsync(CreateFreeTrialSubscriptionCommand command)
    {
        var existingSubscription = await subscriptionReadRepository.GetByUserIdAsync(command.Request.UserId);
        var freeTrialModel = await pricingModelReadRepository.GetByNameAsync("FreeTrial");
        if (freeTrialModel is null)
            throw new InvalidOperationException("FreeTrial pricing model not found");

        if (existingSubscription is not null)
        {
            existingSubscription.Status = SubscriptionStatus.FreeTrial;
            existingSubscription.PricingModelId = freeTrialModel.Id;
            existingSubscription.BypassPayment = false;
            existingSubscription.StripeCustomerId = string.Empty;
            existingSubscription.StripeSubscriptionId = string.Empty;
            existingSubscription.CurrentPeriodEnd = null;
            return await subscriptionWriteRepository.UpdateAsync(existingSubscription);
        }

        var subscription = new SubscriptionDomain
        {
            Id = Guid.NewGuid(),
            UserId = command.Request.UserId,
            Status = SubscriptionStatus.FreeTrial,
            PricingModelId = freeTrialModel.Id,
            BypassPayment = false,
            CreatedAt = DateTime.UtcNow
        };

        return await subscriptionWriteRepository.InsertAsync(subscription);
    }
}

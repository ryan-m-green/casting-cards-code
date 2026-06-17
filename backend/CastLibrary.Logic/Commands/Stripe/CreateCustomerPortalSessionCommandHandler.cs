using CastLibrary.Adapter.Services;
using CastLibrary.Repository.Repositories.Read;
namespace CastLibrary.Logic.Commands.Stripe;
public interface ICreateCustomerPortalSessionCommandHandler
{
    Task<string> HandleAsync(CreateCustomerPortalSessionCommand command);
}
public class CreateCustomerPortalSessionCommandHandler(
    IStripeService stripeService,
    ISubscriptionReadRepository subscriptionReadRepository) : ICreateCustomerPortalSessionCommandHandler
{
    public async Task<string> HandleAsync(CreateCustomerPortalSessionCommand command)
    {
        var subscription = await subscriptionReadRepository.GetByUserIdAsync(command.UserId);
        if (subscription == null || string.IsNullOrEmpty(subscription.StripeCustomerId))
        {
            throw new Exception("Subscription or Stripe customer not found");
        }

        var portalUrl = stripeService.CreateCustomerPortalSession(
            subscription.StripeCustomerId,
            command.ReturnUrl
        );
        return portalUrl;
    }
}

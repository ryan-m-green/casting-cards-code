using CastLibrary.Adapter.Services;
namespace CastLibrary.Logic.Commands.Stripe;
public interface IGetOrCreateStripeCustomerCommandHandler
{
    Task<string> HandleAsync(GetOrCreateStripeCustomerCommand command);
}
public class GetOrCreateStripeCustomerCommandHandler(IStripeService stripeService) : IGetOrCreateStripeCustomerCommandHandler
{
    public async Task<string> HandleAsync(GetOrCreateStripeCustomerCommand command)
    {
        var customerId = stripeService.GetOrCreateStripeCustomer(command.UserId, command.Email);
        return await Task.FromResult(customerId);
    }
}

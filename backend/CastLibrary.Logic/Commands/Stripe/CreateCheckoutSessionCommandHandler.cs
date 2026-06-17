using CastLibrary.Adapter.Services;
using CastLibrary.Repository.Repositories.Read;
namespace CastLibrary.Logic.Commands.Stripe;
public interface ICreateCheckoutSessionCommandHandler
{
    Task<string> HandleAsync(CreateCheckoutSessionCommand command);
}
public class CreateCheckoutSessionCommandHandler(
    IStripeService stripeService,
    IPricingModelReadRepository pricingModelReadRepository) : ICreateCheckoutSessionCommandHandler
{
    public async Task<string> HandleAsync(CreateCheckoutSessionCommand command)
    {
        var activePricingModel = await pricingModelReadRepository.GetActiveAsync();
        var checkoutUrl = stripeService.CreateCheckoutSession(
            command.UserId,
            activePricingModel.StripePriceId,
            command.SuccessUrl,
            command.CancelUrl
        );
        return checkoutUrl;
    }
}

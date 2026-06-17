namespace CastLibrary.Logic.Commands.Stripe;
public class CreateCheckoutSessionCommand
{
    public CreateCheckoutSessionCommand(Guid userId, string successUrl, string cancelUrl)
    {
        UserId = userId;
        SuccessUrl = successUrl;
        CancelUrl = cancelUrl;
    }
    public Guid UserId { get; }
    public string SuccessUrl { get; }
    public string CancelUrl { get; }
}

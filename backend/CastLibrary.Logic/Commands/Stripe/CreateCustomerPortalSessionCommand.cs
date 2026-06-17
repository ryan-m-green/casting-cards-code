namespace CastLibrary.Logic.Commands.Stripe;
public class CreateCustomerPortalSessionCommand
{
    public CreateCustomerPortalSessionCommand(Guid userId, string returnUrl)
    {
        UserId = userId;
        ReturnUrl = returnUrl;
    }
    public Guid UserId { get; }
    public string ReturnUrl { get; }
}

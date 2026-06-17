namespace CastLibrary.Logic.Commands.Stripe;
public class GetOrCreateStripeCustomerCommand
{
    public GetOrCreateStripeCustomerCommand(Guid userId, string email)
    {
        UserId = userId;
        Email = email;
    }
    public Guid UserId { get; }
    public string Email { get; }
}

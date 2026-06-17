using CastLibrary.Shared.Requests;
namespace CastLibrary.Logic.Commands.Subscription;
public class CreateFreeTrialSubscriptionCommand
{
    public CreateFreeTrialSubscriptionCommand(CreateFreeTrialSubscriptionRequest request)
    {
        Request = request;
    }
    public CreateFreeTrialSubscriptionRequest Request { get; }
}

namespace CastLibrary.Logic.Queries.Subscription;
public class GetUserSubscriptionQuery
{
    public GetUserSubscriptionQuery(Guid userId)
    {
        UserId = userId;
    }
    public Guid UserId { get; }
}

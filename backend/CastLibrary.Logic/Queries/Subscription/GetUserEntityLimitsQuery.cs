namespace CastLibrary.Logic.Queries.Subscription;
public class GetUserEntityLimitsQuery
{
    public GetUserEntityLimitsQuery(Guid userId)
    {
        UserId = userId;
    }
    public Guid UserId { get; }
}

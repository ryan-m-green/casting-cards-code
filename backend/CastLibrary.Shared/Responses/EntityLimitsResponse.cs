namespace CastLibrary.Shared.Responses;

public class EntityLimitsResponse
{
    public EntityLimitInfo Campaigns { get; set; }
    public EntityLimitInfo Locations { get; set; }
    public EntityLimitInfo Sublocations { get; set; }
    public EntityLimitInfo Factions { get; set; }
    public EntityLimitInfo Cast { get; set; }
}

public class EntityLimitInfo
{
    public int CurrentCount { get; set; }
    public int Limit { get; set; }
    public bool LimitReached { get; set; }
}

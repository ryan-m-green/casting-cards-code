namespace CastLibrary.Shared.Responses;

public class SubscriptionLimits
{
    public SubscriptionTier FreeTrial { get; set; }
    public SubscriptionTier Paid { get; set; }
}

public class SubscriptionTier
{
    public int Campaigns { get; set; }
    public int Locations { get; set; }
    public int Sublocations { get; set; }
    public int Factions { get; set; }
    public int Cast { get; set; }
}

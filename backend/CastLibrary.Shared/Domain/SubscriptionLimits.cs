namespace CastLibrary.Shared.Domain;

public class SubscriptionLimits
{
    public int Campaigns { get; set; }
    public int Locations { get; set; }
    public int Sublocations { get; set; }
    public int Factions { get; set; }
    public int Cast { get; set; }
}

public class SubscriptionLimitsConfig
{
    public SubscriptionLimits FreeTrial { get; set; }
    public SubscriptionLimits Paid { get; set; }
}

using System.Text.Json.Serialization;

namespace CastLibrary.Shared.Domain;
public class SubscriptionLimitsDomain
{
    [JsonPropertyName("FreeTrial")]
    public FreeTrialLimits FreeTrial { get; set; } = new();
    [JsonPropertyName("Paid")]
    public PaidLimits Paid { get; set; } = new();
}

public class FreeTrialLimits
{
    [JsonPropertyName("campaigns")]
    public int Campaigns { get; set; }
    [JsonPropertyName("locations")]
    public int Locations { get; set; }
    [JsonPropertyName("sublocations")]
    public int Sublocations { get; set; }
    [JsonPropertyName("factions")]
    public int Factions { get; set; }
    [JsonPropertyName("cast")]
    public int Cast { get; set; }
}

public class PaidLimits
{
    [JsonPropertyName("campaigns")]
    public int Campaigns { get; set; }
    [JsonPropertyName("locations")]
    public int Locations { get; set; }
    [JsonPropertyName("sublocations")]
    public int Sublocations { get; set; }
    [JsonPropertyName("factions")]
    public int Factions { get; set; }
    [JsonPropertyName("cast")]
    public int Cast { get; set; }
}

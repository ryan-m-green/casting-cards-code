using System.Text.Json.Serialization;

namespace CastLibrary.Shared.Domain;

public class StripeConfigurationDomain
{
    [JsonPropertyName("testAccount")]
    public StripeAccount TestAccount { get; set; }
    
    [JsonPropertyName("liveAccount")]
    public StripeAccount LiveAccount { get; set; }
    
    [JsonPropertyName("activeAccount")]
    public string ActiveAccount { get; set; }
}

public class StripeAccount
{
    public string SecretKey { get; set; }
    public string PublishableKey { get; set; }
    public string WebhookSecret { get; set; }
    public string SuccessUrl { get; set; }
    public string CancelUrl { get; set; }
    public string ReturnUrl { get; set; }
}

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
    [JsonPropertyName("secretKey")]
    public string SecretKey { get; set; }
    
    [JsonPropertyName("publishableKey")]
    public string PublishableKey { get; set; }
    
    [JsonPropertyName("webhookSecret")]
    public string WebhookSecret { get; set; }
    
    [JsonPropertyName("successUrl")]
    public string SuccessUrl { get; set; }
    
    [JsonPropertyName("cancelUrl")]
    public string CancelUrl { get; set; }
    
    [JsonPropertyName("returnUrl")]
    public string ReturnUrl { get; set; }
}

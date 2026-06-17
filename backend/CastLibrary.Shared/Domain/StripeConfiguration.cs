namespace CastLibrary.Shared.Domain;

public class StripeConfigurationDomain
{
    public StripeAccount TestAccount { get; set; }
    public StripeAccount LiveAccount { get; set; }
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

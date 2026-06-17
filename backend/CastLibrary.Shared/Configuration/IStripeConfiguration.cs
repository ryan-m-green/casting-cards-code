namespace CastLibrary.Shared.Configuration;

public interface IStripeConfiguration
{
    string SecretKey { get; }
    string PublishableKey { get; }
    string WebhookSecret { get; }
    string SuccessUrl { get; }
    string CancelUrl { get; }
    string ReturnUrl { get; }
    Task RefreshAsync();
}

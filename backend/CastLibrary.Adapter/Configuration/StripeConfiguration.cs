using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Adapter.Configuration;

public class StripeConfiguration : Shared.Configuration.IStripeConfiguration
{
    private readonly Shared.Configuration.IConfigurationCache _configurationCache;
    private StripeConfigurationDomain _config;
    private readonly object _lock = new();

    public StripeConfiguration(Shared.Configuration.IConfigurationCache configurationCache)
    {
        _configurationCache = configurationCache;
    }

    private async Task EnsureLoadedAsync()
    {
        if (_config is null)
        {
            lock (_lock)
            {
                if (_config is null)
                {
                    var config = _configurationCache.GetAsync<StripeConfigurationDomain>(CastCardsConfigurationKeys.StripeConfiguration)
                        .GetAwaiter().GetResult();
                    
                    if (config is null)
                    {
                        throw new InvalidOperationException("Stripe configuration not found in database. Payments will not work.");
                    }
                    
                    _config = config;
                }
            }
        }
    }

    public string SecretKey
    {
        get
        {
            EnsureLoadedAsync().GetAwaiter().GetResult();
            var account = _config.ActiveAccount.ToLower() == "live" ? _config.LiveAccount : _config.TestAccount;
            return account?.SecretKey ?? string.Empty;
        }
    }

    public string PublishableKey
    {
        get
        {
            EnsureLoadedAsync().GetAwaiter().GetResult();
            var account = _config.ActiveAccount.ToLower() == "live" ? _config.LiveAccount : _config.TestAccount;
            return account?.PublishableKey ?? string.Empty;
        }
    }

    public string WebhookSecret
    {
        get
        {
            EnsureLoadedAsync().GetAwaiter().GetResult();
            var account = _config.ActiveAccount.ToLower() == "live" ? _config.LiveAccount : _config.TestAccount;
            return account?.WebhookSecret ?? string.Empty;
        }
    }

    public string SuccessUrl
    {
        get
        {
            EnsureLoadedAsync().GetAwaiter().GetResult();
            var account = _config.ActiveAccount.ToLower() == "live" ? _config.LiveAccount : _config.TestAccount;
            return account?.SuccessUrl ?? string.Empty;
        }
    }

    public string CancelUrl
    {
        get
        {
            EnsureLoadedAsync().GetAwaiter().GetResult();
            var account = _config.ActiveAccount.ToLower() == "live" ? _config.LiveAccount : _config.TestAccount;
            return account?.CancelUrl ?? string.Empty;
        }
    }

    public string ReturnUrl
    {
        get
        {
            EnsureLoadedAsync().GetAwaiter().GetResult();
            var account = _config.ActiveAccount.ToLower() == "live" ? _config.LiveAccount : _config.TestAccount;
            return account?.ReturnUrl ?? string.Empty;
        }
    }

    public async Task RefreshAsync()
    {
        await _configurationCache.RefreshAsync(CastCardsConfigurationKeys.StripeConfiguration);
        lock (_lock)
        {
            _config = null;
        }
    }
}

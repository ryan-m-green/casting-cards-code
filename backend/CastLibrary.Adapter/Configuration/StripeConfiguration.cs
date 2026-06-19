using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using Microsoft.Extensions.Logging;

namespace CastLibrary.Adapter.Configuration;

public class StripeConfiguration : Shared.Configuration.IStripeConfiguration
{
    private readonly Shared.Configuration.IConfigurationCache _configurationCache;
    private readonly ILogger<StripeConfiguration> _logger;
    private StripeConfigurationDomain _config;
    private readonly object _lock = new();

    public StripeConfiguration(Shared.Configuration.IConfigurationCache configurationCache, ILogger<StripeConfiguration> logger)
    {
        _configurationCache = configurationCache;
        _logger = logger;
    }

    private async Task EnsureLoadedAsync()
    {
        if (_config is null)
        {
            lock (_lock)
            {
                if (_config is null)
                {
                    _logger.LogInformation("Loading Stripe configuration from database...");
                    
                    var config = _configurationCache.GetAsync<StripeConfigurationDomain>(CastCardsConfigurationKeys.StripeConfiguration)
                        .GetAwaiter().GetResult();
                    
                    if (config is null)
                    {
                        _logger.LogError("Stripe configuration not found in database. Payments will not work.");
                        throw new InvalidOperationException("Stripe configuration not found in database. Payments will not work.");
                    }
                    
                    _logger.LogInformation("Stripe configuration loaded successfully. Active account: {ActiveAccount}", config.ActiveAccount);
                    _logger.LogInformation("Test account has secret key: {HasSecretKey}", !string.IsNullOrEmpty(config.TestAccount?.SecretKey));
                    _logger.LogInformation("Live account has secret key: {HasSecretKey}", !string.IsNullOrEmpty(config.LiveAccount?.SecretKey));
                    
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
            var secretKey = account?.SecretKey ?? string.Empty;
            
            _logger.LogInformation("Stripe SecretKey requested. Active account: {ActiveAccount}, Key provided: {HasKey}", 
                _config.ActiveAccount, !string.IsNullOrEmpty(secretKey));
            
            return secretKey;
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

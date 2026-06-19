using Stripe;
using Stripe.Checkout;
using CastLibrary.Shared.Configuration;
using CastLibrary.Shared.Enums;
using Microsoft.Extensions.Logging;

namespace CastLibrary.Adapter.Services;

public interface IStripeService
{
    string CreateCheckoutSession(Guid userId, string pricingModelId, string successUrl, string cancelUrl);
    Event HandleWebhook(string jsonPayload, string stripeSignature, string webhookSecret);
    string GetOrCreateStripeCustomer(Guid userId, string email);
    Task<Invoice> GetLatestInvoiceAsync(string stripeSubscriptionId);
    LockLevel CalculateLockLevel(DateTime invoiceDueDate);
    string CreateCustomerPortalSession(string stripeCustomerId, string returnUrl);
    Task<Charge> GetChargeAsync(string chargeId);
}

public class StripeService(IStripeConfiguration stripeConfiguration, ILogger<StripeService> logger) : IStripeService
{
    public string CreateCheckoutSession(Guid userId, string pricingModelId, string successUrl, string cancelUrl)
    {
        logger.LogInformation("CreateCheckoutSession called for userId: {UserId}", userId);
        
        var secretKey = stripeConfiguration.SecretKey;
        logger.LogInformation("Retrieved Stripe SecretKey: {HasKey}", !string.IsNullOrEmpty(secretKey));
        
        if (string.IsNullOrEmpty(secretKey))
        {
            logger.LogError("Stripe SecretKey is null or empty");
        }
        
        StripeConfiguration.ApiKey = secretKey;

        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    Price = pricingModelId,
                    Quantity = 1,
                },
            },
            Mode = "subscription",
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl,
            ClientReferenceId = userId.ToString(),
            Metadata = new Dictionary<string, string>
            {
                { "userId", userId.ToString() }
            }
        };

        var service = new SessionService();
        Session session = service.Create(options);

        return session.Url;
    }

    public Event HandleWebhook(string jsonPayload, string stripeSignature, string webhookSecret)
    {
        StripeConfiguration.ApiKey = stripeConfiguration.SecretKey;
        
        try
        {
            return EventUtility.ConstructEvent(jsonPayload, stripeSignature, webhookSecret);
        }
        catch (StripeException e)
        {
            throw new Exception($"Stripe webhook signature verification failed: {e.Message}");
        }
    }

    public string GetOrCreateStripeCustomer(Guid userId, string email)
    {
        // Placeholder for customer creation - to be implemented in slice 4
        return "customer_placeholder";
    }

    public async Task<Invoice> GetLatestInvoiceAsync(string stripeSubscriptionId)
    {
        StripeConfiguration.ApiKey = stripeConfiguration.SecretKey;
        var service = new InvoiceService();
        var options = new InvoiceListOptions
        {
            Subscription = stripeSubscriptionId,
            Limit = 1
        };

        try
        {
            var invoices = await service.ListAsync(options);
            return invoices.FirstOrDefault();
        }
        catch
        {
            return null;
        }
    }

    public LockLevel CalculateLockLevel(DateTime invoiceDueDate)
    {
        var daysPastDue = (DateTime.UtcNow - invoiceDueDate).Days;

        if (daysPastDue < 0)
        {
            return LockLevel.FullAccess;
        }

        return daysPastDue switch
        {
            <= 7 => LockLevel.FullAccess,
            <= 14 => LockLevel.SoftLock,
            <= 30 => LockLevel.HardLock,
            _ => LockLevel.Suspended
        };
    }

    public string CreateCustomerPortalSession(string stripeCustomerId, string returnUrl)
    {
        StripeConfiguration.ApiKey = stripeConfiguration.SecretKey;

        var options = new SessionCreateOptions
        {
            Customer = stripeCustomerId,
            ReturnUrl = returnUrl,
        };

        var service = new SessionService();
        Session session = service.Create(options);

        return session.Url;
    }

    public async Task<Charge> GetChargeAsync(string chargeId)
    {
        StripeConfiguration.ApiKey = stripeConfiguration.SecretKey;
        var service = new ChargeService();
        return await service.GetAsync(chargeId);
    }

}

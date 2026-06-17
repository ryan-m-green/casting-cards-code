using Stripe;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Adapter.Services;
using CastLibrary.Adapter.Operators;
using Microsoft.Extensions.Configuration;

namespace CastLibrary.Logic.Strategies.InvoiceEvent;

public class InvoicePaymentActionRequiredStrategy : IInvoiceEventStrategy
{
    public string PaymentStatus => "action_required";

    private readonly IStripeService _stripeService;
    private readonly IEmailOperator _emailOperator;
    private readonly IConfiguration _configuration;

    public InvoicePaymentActionRequiredStrategy(IStripeService stripeService, IEmailOperator emailOperator, IConfiguration configuration)
    {
        _stripeService = stripeService;
        _emailOperator = emailOperator;
        _configuration = configuration;
    }

    public async Task ProcessAsync(Invoice invoice, SubscriptionDomain existingSubscription)
    {
        existingSubscription.Status = SubscriptionStatus.PaymentActionRequired;
        existingSubscription.PastDueSince = DateTime.UtcNow;

        var subscriptionId = invoice.Parent?.SubscriptionDetails?.Subscription?.Id;
        if (!string.IsNullOrEmpty(subscriptionId))
        {
            var latestInvoice = await _stripeService.GetLatestInvoiceAsync(subscriptionId);
            if (latestInvoice != null && latestInvoice.DueDate.HasValue)
            {
                var lockLevel = _stripeService.CalculateLockLevel(latestInvoice.DueDate.Value);
                existingSubscription.LockLevel = lockLevel;
            }
            else
            {
                var adminAddress = _configuration["Email:AdminAddress"] ?? throw new InvalidOperationException("Email:AdminAddress not configured");
                var errorEmail = new BugReportNotificationEmailDomain
                {
                    ToEmail = adminAddress,
                    DisplayName = "Admin",
                    Title = "Stripe API Error: Failed to fetch invoice",
                    Description = $"Failed to fetch latest invoice for subscription {subscriptionId}",
                    StepsToReproduce = string.Empty,
                    Severity = "High",
                    ReporterDisplayName = "System",
                    PageUrl = string.Empty,
                    Device = string.Empty,
                    Browser = string.Empty,
                    Os = string.Empty,
                    ScreenResolution = string.Empty,
                    ReportedAt = DateTime.UtcNow
                };
                await _emailOperator.SendEmailAsync(errorEmail);
            }
        }
    }
}

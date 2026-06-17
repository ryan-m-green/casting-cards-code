using Stripe;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Strategies.InvoiceEvent;

public class InvoicePaymentSucceededStrategy : IInvoiceEventStrategy
{
    public string PaymentStatus => "succeeded";

    public Task ProcessAsync(Invoice invoice, SubscriptionDomain existingSubscription)
    {
        existingSubscription.Status = SubscriptionStatus.Active;
        existingSubscription.LockLevel = LockLevel.FullAccess;
        existingSubscription.PastDueSince = null;
        return Task.CompletedTask;
    }
}

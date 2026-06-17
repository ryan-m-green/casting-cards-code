using Stripe;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Strategies.InvoiceEvent;

public interface IInvoiceEventStrategy
{
    string PaymentStatus { get; }
    Task ProcessAsync(Invoice invoice, SubscriptionDomain existingSubscription);
}

using Stripe;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Strategies.InvoiceEvent;

public class InvoiceEventStrategyFactory
{
    private readonly IEnumerable<IInvoiceEventStrategy> _strategies;

    public InvoiceEventStrategyFactory(IEnumerable<IInvoiceEventStrategy> strategies)
    {
        _strategies = strategies;
    }

    public async Task ProcessInvoiceEventAsync(string paymentStatus, Invoice invoice, SubscriptionDomain existingSubscription)
    {
        var strategy = _strategies.FirstOrDefault(s => s.PaymentStatus.Equals(paymentStatus, StringComparison.OrdinalIgnoreCase));
        if (strategy == null)
        {
            throw new ArgumentException($"Unknown invoice payment status: {paymentStatus}");
        }
        await strategy.ProcessAsync(invoice, existingSubscription);
    }
}

using CastLibrary.Shared.Enums;
namespace CastLibrary.Shared.Domain;
public class SubscriptionDomain
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string StripeCustomerId { get; set; }
    public string StripeSubscriptionId { get; set; }
    public SubscriptionStatus Status { get; set; }
    public Guid? PricingModelId { get; set; }
    public bool BypassPayment { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PastDueSince { get; set; }
    public LockLevel LockLevel { get; set; }
}

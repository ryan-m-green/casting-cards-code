namespace CastLibrary.Shared.Entities;
public class SubscriptionEntity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string StripeCustomerId { get; set; } = string.Empty;
    public string StripeSubscriptionId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid? PricingModelId { get; set; }
    public bool BypassPayment { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PastDueSince { get; set; }
    public string LockLevel { get; set; } = "full_access";
}

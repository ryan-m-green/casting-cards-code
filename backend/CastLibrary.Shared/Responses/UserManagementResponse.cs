namespace CastLibrary.Shared.Responses;

public class UserManagementResponse
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    
    // Subscription fields
    public Guid? SubscriptionId { get; set; }
    public string StripeCustomerId { get; set; } = string.Empty;
    public string StripeSubscriptionId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool BypassPayment { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public string LockLevel { get; set; } = string.Empty;
}

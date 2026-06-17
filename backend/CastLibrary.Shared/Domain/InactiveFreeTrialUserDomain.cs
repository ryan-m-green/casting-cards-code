namespace CastLibrary.Shared.Domain;

public class InactiveFreeTrialUserDomain
{
    public Guid UserId { get; set; }
    public string Email { get; set; }
    public string DisplayName { get; set; }
    public bool EmailVerified { get; set; }
    public DateTime LastLoggedInOn { get; set; }
    public Guid SubscriptionId { get; set; }
    public string Status { get; set; }
    public int LockLevel { get; set; }
    public DateTime? PastDueSince { get; set; }
}

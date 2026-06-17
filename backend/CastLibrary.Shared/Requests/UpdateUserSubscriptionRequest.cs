namespace CastLibrary.Shared.Requests;

public class UpdateUserSubscriptionRequest
{
    public string Status { get; set; } = string.Empty;
    public bool BypassPayment { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public string LockLevel { get; set; } = string.Empty;
}

using CastLibrary.Shared.Enums;
namespace CastLibrary.Shared.Domain;

public class GoldTransactionDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? PlayerUserId { get; set; }
    public int Amount { get; set; }
    public TransactionType TransactionType { get; set; }
    public string Description { get; set; } = string.Empty;
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

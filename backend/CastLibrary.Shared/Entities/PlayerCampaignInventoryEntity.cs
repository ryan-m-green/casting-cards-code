namespace CastLibrary.Shared.Entities;

public class PlayerCampaignInventoryEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid PlayerUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; }
    public int Count { get; set; }
}

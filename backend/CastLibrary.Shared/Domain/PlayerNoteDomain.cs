namespace CastLibrary.Shared.Domain;

public class PlayerNoteDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

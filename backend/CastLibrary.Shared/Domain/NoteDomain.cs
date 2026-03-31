using CastLibrary.Shared.Enums;
namespace CastLibrary.Shared.Domain;

public class CampaignNoteDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public EntityType EntityType { get; set; }
    public Guid InstanceId { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid CreatedByUserId { get; set; }
    public string CreatedByDisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

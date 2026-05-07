namespace CastLibrary.Shared.Entities;

public class CampaignFactionRelationshipEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid FactionInstanceIdA { get; set; }
    public Guid FactionInstanceIdB { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public short Strength { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? DmUserId { get; set; }
}

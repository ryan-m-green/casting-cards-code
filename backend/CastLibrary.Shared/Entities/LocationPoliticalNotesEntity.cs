namespace CastLibrary.Shared.Entities;

public class LocationPoliticalNotesEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid LocationInstanceId { get; set; }
    public string GeneralNotes { get; set; } = string.Empty;
    public string Factions { get; set; } = "[]";
    public string Relationships { get; set; } = "[]";
    public string NpcRoles { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

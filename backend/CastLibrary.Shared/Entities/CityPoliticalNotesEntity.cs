namespace CastLibrary.Shared.Entities;

public class CityPoliticalNotesEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid CityInstanceId { get; set; }
    public string GeneralNotes { get; set; } = string.Empty;
    public string Factions { get; set; } = "[]";
    public string Relationships { get; set; } = "[]";
    public string NpcRoles { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

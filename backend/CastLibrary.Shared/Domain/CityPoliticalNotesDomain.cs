namespace CastLibrary.Shared.Domain;

public class CityPoliticalNotesDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid CityInstanceId { get; set; }
    public string GeneralNotes { get; set; } = string.Empty;
    public List<CityFactionDomain> Factions { get; set; } = [];
    public List<CityFactionRelationshipDomain> Relationships { get; set; } = [];
    public List<CityNpcRoleDomain> NpcRoles { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CityFactionDomain
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Influence { get; set; }
    public bool IsHidden { get; set; }
    public int SortOrder { get; set; }
}

public class CityFactionRelationshipDomain
{
    public Guid Id { get; set; }
    public Guid FactionAId { get; set; }
    public Guid FactionBId { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public int Strength { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class CityNpcRoleDomain
{
    public Guid Id { get; set; }
    public Guid CastInstanceId { get; set; }
    public Guid FactionId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Motivation { get; set; } = string.Empty;
}

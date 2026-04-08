namespace CastLibrary.Shared.Responses;

public class LocationPoliticalNotesResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid LocationInstanceId { get; set; }
    public string GeneralNotes { get; set; } = string.Empty;
    public List<LocationFactionResponse> Factions { get; set; } = [];
    public List<LocationFactionRelationshipResponse> Relationships { get; set; } = [];
    public List<LocationNpcRoleResponse> NpcRoles { get; set; } = [];
    public DateTime UpdatedAt { get; set; }
}

public class LocationFactionResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Influence { get; set; }
    public bool IsHidden { get; set; }
    public int SortOrder { get; set; }
}

public class LocationFactionRelationshipResponse
{
    public Guid Id { get; set; }
    public Guid FactionAId { get; set; }
    public Guid FactionBId { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public int Strength { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class LocationNpcRoleResponse
{
    public Guid Id { get; set; }
    public Guid CastInstanceId { get; set; }
    public Guid FactionId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Motivation { get; set; } = string.Empty;
}

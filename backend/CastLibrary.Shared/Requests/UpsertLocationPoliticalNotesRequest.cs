namespace CastLibrary.Shared.Requests;

public class UpsertLocationPoliticalNotesRequest
{
    public string GeneralNotes { get; set; } = string.Empty;
    public List<LocationFactionRequest> Factions { get; set; } = [];
    public List<LocationFactionRelationshipRequest> Relationships { get; set; } = [];
    public List<LocationNpcRoleRequest> NpcRoles { get; set; } = [];
}

public class LocationFactionRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Influence { get; set; }
    public bool IsHidden { get; set; }
    public int SortOrder { get; set; }
}

public class LocationFactionRelationshipRequest
{
    public Guid Id { get; set; }
    public Guid FactionAId { get; set; }
    public Guid FactionBId { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public int Strength { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class LocationNpcRoleRequest
{
    public Guid Id { get; set; }
    public Guid CastInstanceId { get; set; }
    public Guid FactionId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Motivation { get; set; } = string.Empty;
}

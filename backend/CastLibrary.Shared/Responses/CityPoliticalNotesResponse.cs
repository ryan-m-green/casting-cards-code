namespace CastLibrary.Shared.Responses;

public class CityPoliticalNotesResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid CityInstanceId { get; set; }
    public string GeneralNotes { get; set; } = string.Empty;
    public List<CityFactionResponse> Factions { get; set; } = [];
    public List<CityFactionRelationshipResponse> Relationships { get; set; } = [];
    public List<CityNpcRoleResponse> NpcRoles { get; set; } = [];
    public DateTime UpdatedAt { get; set; }
}

public class CityFactionResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Influence { get; set; }
    public bool IsHidden { get; set; }
    public int SortOrder { get; set; }
}

public class CityFactionRelationshipResponse
{
    public Guid Id { get; set; }
    public Guid FactionAId { get; set; }
    public Guid FactionBId { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public int Strength { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class CityNpcRoleResponse
{
    public Guid Id { get; set; }
    public Guid CastInstanceId { get; set; }
    public Guid FactionId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Motivation { get; set; } = string.Empty;
}

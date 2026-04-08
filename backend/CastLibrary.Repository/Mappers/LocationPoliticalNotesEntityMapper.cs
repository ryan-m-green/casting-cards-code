using System.Text.Json;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ILocationPoliticalNotesEntityMapper
{
    LocationPoliticalNotesDomain ToDomain(LocationPoliticalNotesEntity entity);
}

public class LocationPoliticalNotesEntityMapper : ILocationPoliticalNotesEntityMapper
{
    private static readonly JsonSerializerOptions _opts = new() { PropertyNameCaseInsensitive = true };

    public LocationPoliticalNotesDomain ToDomain(LocationPoliticalNotesEntity entity) => new()
    {
        Id             = entity.Id,
        CampaignId     = entity.CampaignId,
        LocationInstanceId = entity.LocationInstanceId,
        GeneralNotes   = entity.GeneralNotes ?? string.Empty,
        Factions       = Deserialize<LocationFactionDomain>(entity.Factions),
        Relationships  = Deserialize<LocationFactionRelationshipDomain>(entity.Relationships),
        NpcRoles       = Deserialize<LocationNpcRoleDomain>(entity.NpcRoles),
        CreatedAt      = entity.CreatedAt,
        UpdatedAt      = entity.UpdatedAt,
    };

    private static List<T> Deserialize<T>(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        return JsonSerializer.Deserialize<List<T>>(json, _opts) ?? [];
    }
}



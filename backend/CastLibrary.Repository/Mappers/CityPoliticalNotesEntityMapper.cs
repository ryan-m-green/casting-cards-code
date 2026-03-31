using System.Text.Json;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ICityPoliticalNotesEntityMapper
{
    CityPoliticalNotesDomain ToDomain(CityPoliticalNotesEntity entity);
}

public class CityPoliticalNotesEntityMapper : ICityPoliticalNotesEntityMapper
{
    private static readonly JsonSerializerOptions _opts = new() { PropertyNameCaseInsensitive = true };

    public CityPoliticalNotesDomain ToDomain(CityPoliticalNotesEntity entity) => new()
    {
        Id             = entity.Id,
        CampaignId     = entity.CampaignId,
        CityInstanceId = entity.CityInstanceId,
        GeneralNotes   = entity.GeneralNotes ?? string.Empty,
        Factions       = Deserialize<CityFactionDomain>(entity.Factions),
        Relationships  = Deserialize<CityFactionRelationshipDomain>(entity.Relationships),
        NpcRoles       = Deserialize<CityNpcRoleDomain>(entity.NpcRoles),
        CreatedAt      = entity.CreatedAt,
        UpdatedAt      = entity.UpdatedAt,
    };

    private static List<T> Deserialize<T>(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        return JsonSerializer.Deserialize<List<T>>(json, _opts) ?? [];
    }
}

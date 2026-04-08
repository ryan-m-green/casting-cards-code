using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ILocationPoliticalNotesMapper
    {
        LocationPoliticalNotesResponse ToResponse(LocationPoliticalNotesDomain domain);
    }
    public class LocationPoliticalNotesMapper(
        ILocationFactionMapper locationFactionMapper,
        ILocationFactionRelationshipMapper locationFactionRelationshipMapper,
        ILocationNpcRolesMapper locationNpcRolesMapper) : ILocationPoliticalNotesMapper
    {
        public LocationPoliticalNotesResponse ToResponse(LocationPoliticalNotesDomain domain)
        {
            if (domain == null)
            {
                return null;
            }

            return new LocationPoliticalNotesResponse
            {
                Id = domain.Id,
                CampaignId = domain.CampaignId,
                LocationInstanceId = domain.LocationInstanceId,
                GeneralNotes = domain.GeneralNotes,
                Factions = locationFactionMapper.ToResponse(domain.Factions),
                Relationships = locationFactionRelationshipMapper.ToResponse(domain.Relationships),
                NpcRoles = locationNpcRolesMapper.ToResponse(domain.NpcRoles),
                UpdatedAt = domain.UpdatedAt
            };
        }
    }
}


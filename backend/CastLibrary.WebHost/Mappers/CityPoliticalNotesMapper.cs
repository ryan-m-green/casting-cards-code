using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ICityPoliticalNotesMapper
    {
        CityPoliticalNotesResponse ToResponse(CityPoliticalNotesDomain domain);
    }
    public class CityPoliticalNotesMapper(
        ICityFactionMapper cityFactionMapper,
        ICityFactionRelationshipMapper cityFactionRelationshipMapper,
        ICityNpcRolesMapper cityNpcRolesMapper) : ICityPoliticalNotesMapper
    {
        public CityPoliticalNotesResponse ToResponse(CityPoliticalNotesDomain domain)
        {
            if (domain == null)
            {
                return null;
            }

            return new CityPoliticalNotesResponse
            {
                Id = domain.Id,
                CampaignId = domain.CampaignId,
                CityInstanceId = domain.CityInstanceId,
                GeneralNotes = domain.GeneralNotes,
                Factions = cityFactionMapper.ToResponse(domain.Factions),
                Relationships = cityFactionRelationshipMapper.ToResponse(domain.Relationships),
                NpcRoles = cityNpcRolesMapper.ToResponse(domain.NpcRoles),
                UpdatedAt = domain.UpdatedAt
            };
        }
    }
}

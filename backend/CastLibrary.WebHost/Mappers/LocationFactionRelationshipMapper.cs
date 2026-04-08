using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ILocationFactionRelationshipMapper
    {
        List<LocationFactionRelationshipResponse> ToResponse(List<LocationFactionRelationshipDomain> domain);
    }
    public class LocationFactionRelationshipMapper : ILocationFactionRelationshipMapper
    {
        public List<LocationFactionRelationshipResponse> ToResponse(List<LocationFactionRelationshipDomain> domain)
        {
            return domain.Select(o => new LocationFactionRelationshipResponse
            {
                Id = o.Id,
                FactionAId = o.FactionAId,
                FactionBId = o.FactionBId,
                RelationshipType = o.RelationshipType,
                Strength = o.Strength,
                Notes = o.Notes
            }).ToList();
        }
    }
}


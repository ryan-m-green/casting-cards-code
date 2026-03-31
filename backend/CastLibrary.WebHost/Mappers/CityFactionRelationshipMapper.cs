using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ICityFactionRelationshipMapper
    {
        List<CityFactionRelationshipResponse> ToResponse(List<CityFactionRelationshipDomain> domain);
    }
    public class CityFactionRelationshipMapper : ICityFactionRelationshipMapper
    {
        public List<CityFactionRelationshipResponse> ToResponse(List<CityFactionRelationshipDomain> domain)
        {
            return domain.Select(o => new CityFactionRelationshipResponse
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

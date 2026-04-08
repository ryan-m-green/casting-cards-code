using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ILocationFactionMapper
    {
        List<LocationFactionResponse> ToResponse(List<LocationFactionDomain> domain);
    }
    public class LocationFactionMapper : ILocationFactionMapper
    {
        public List<LocationFactionResponse> ToResponse(List<LocationFactionDomain> domain)
        {
            return domain.Select(o => new LocationFactionResponse
            {
                Id = o.Id,
                Name = o.Name,
                Type = o.Type,
                Influence = o.Influence,
                IsHidden = o.IsHidden,
                SortOrder = o.SortOrder
            }).ToList();
        }
    }
}

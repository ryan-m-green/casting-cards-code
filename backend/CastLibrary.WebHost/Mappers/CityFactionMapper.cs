using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ICityFactionMapper
    {
        List<CityFactionResponse> ToResponse(List<CityFactionDomain> domain);
    }
    public class CityFactionMapper : ICityFactionMapper
    {
        public List<CityFactionResponse> ToResponse(List<CityFactionDomain> domain)
        {
            return domain.Select(o => new CityFactionResponse
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

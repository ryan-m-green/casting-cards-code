using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface ILocationWebMapper
{
    LocationResponse ToResponse(LocationDomain domain);
}
/// <summary>
/// Maps Location domain objects to API response objects.
/// Logs every transformation with OTel-compatible structured entries.
/// </summary>
public class LocationWebMapper(
    ILoggingService logging,
    ICorrelationContext correlation) : ILocationWebMapper
{
    private const string Ns = "CastLibrary.WebHost.Mappers";

    public LocationResponse ToResponse(LocationDomain domain)
    {
        var response = new LocationResponse
        {
            Id = domain.Id,
            DmUserId = domain.DmUserId,
            CityId = domain.CityId,
            Name = domain.Name,
            Description = domain.Description,
            ImageUrl = domain.ImageUrl,
            CreatedAt = domain.CreatedAt,
            ShopItems = domain.ShopItems.Select(s => new ShopItemResponse
            {
                Id = s.Id,
                Name = s.Name,
                Price = s.Price,
                Description = s.Description,
            }).ToList(),
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "LocationWebMapper.ToResponse",
            "domain→response",
            domain, response);

        return response;
    }
}

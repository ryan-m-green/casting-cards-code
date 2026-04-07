using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface ISublocationWebMapper
{
    SublocationResponse ToResponse(SublocationDomain domain);
}
/// <summary>
/// Maps Sublocation domain objects to API response objects.
/// Logs every transformation with OTel-compatible structured entries.
/// </summary>
public class SublocationWebMapper(
    ILoggingService logging,
    ICorrelationContext correlation) : ISublocationWebMapper
{
    private const string Ns = "CastLibrary.WebHost.Mappers";

    public SublocationResponse ToResponse(SublocationDomain domain)
    {
        var response = new SublocationResponse
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
            Ns, "SublocationWebMapper.ToResponse",
            "domain→response",
            domain, response);

        return response;
    }
}

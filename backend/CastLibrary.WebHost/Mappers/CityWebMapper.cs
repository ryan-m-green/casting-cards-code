using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface ICityWebMapper
{
    CityResponse ToResponse(CityDomain domain);
}
/// <summary>
/// Maps City domain objects to API response objects.
/// Logs every transformation with OTel-compatible structured entries.
/// </summary>
public class CityWebMapper(
    ILoggingService       logging,
    ICorrelationContext   correlation) : ICityWebMapper
{
    private const string Ns = "CastLibrary.WebHost.Mappers";

    public CityResponse ToResponse(CityDomain domain)
    {
        var response = new CityResponse
        {
            Id             = domain.Id,
            DmUserId       = domain.DmUserId,
            Name           = domain.Name,
            Classification = domain.Classification,
            Size           = domain.Size,
            Condition      = domain.Condition,
            Geography      = domain.Geography,
            Architecture   = domain.Architecture,
            Climate        = domain.Climate,
            Religion       = domain.Religion,
            Vibe           = domain.Vibe,
            Languages      = domain.Languages,
            Description    = domain.Description,
            ImageUrl       = domain.ImageUrl,
            CreatedAt      = domain.CreatedAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CityWebMapper.ToResponse",
            "domain→response",
            domain, response);

        return response;
    }
}

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
    ILoggingService       logging,
    ICorrelationContext   correlation) : ILocationWebMapper
{
    private const string Ns = "CastLibrary.WebHost.Mappers";

    public LocationResponse ToResponse(LocationDomain domain)
    {
        var response = new LocationResponse
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
            Ns, "LocationWebMapper.ToResponse",
            "domain?response",
            domain, response);

        return response;
    }
}


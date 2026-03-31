using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface ICastWebMapper
{
    CastResponse ToResponse(CastDomain domain);
}
/// <summary>
/// Maps Cast domain objects to API response objects.
/// Logs every transformation with OTel-compatible structured entries
/// (code.namespace, code.function, mapping.direction, mapping.input, mapping.output).
/// </summary>
public class CastWebMapper(
    ILoggingService       logging,
    ICorrelationContext   correlation) : ICastWebMapper
{
    private const string Ns = "CastLibrary.WebHost.Mappers";

    public CastResponse ToResponse(CastDomain domain)
    {
        var response = new CastResponse
        {
            Id                = domain.Id,
            DmUserId          = domain.DmUserId,
            Name              = domain.Name,
            Pronouns          = domain.Pronouns,
            Race              = domain.Race,
            Role              = domain.Role,
            Age               = domain.Age,
            Alignment         = domain.Alignment,
            Posture           = domain.Posture,
            Speed             = domain.Speed,
            VoicePlacement    = domain.VoicePlacement,
            Description       = domain.Description,
            PublicDescription = domain.PublicDescription,
            ImageUrl          = domain.ImageUrl,
            CreatedAt         = domain.CreatedAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CastWebMapper.ToResponse",
            "domain→response",
            domain, response);

        return response;
    }
}

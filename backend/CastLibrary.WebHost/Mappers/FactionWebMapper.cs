using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface IFactionWebMapper
{
    FactionResponse ToResponse(FactionDomain domain);
}

public class FactionWebMapper(
    ILoggingService logging,
    ICorrelationContext correlation) : IFactionWebMapper
{
    private const string Ns = "CastLibrary.WebHost.Mappers";

    public FactionResponse ToResponse(FactionDomain domain)
    {
        var response = new FactionResponse
        {
            Id         = domain.FactionId,
            DmUserId   = domain.DmUserId,
            Name       = domain.Name,
            Type       = domain.Type,
            Influence  = domain.Influence,
            Perception = domain.Perception,
            Hidden     = domain.Hidden,
            Description = domain.Description,
            DmNotes    = domain.DmNotes,
            SymbolPath = domain.SymbolPath,
            Colors     = domain.Colors,
            ImageUrl   = domain.ImageUrl,
            CreatedAt  = domain.CreatedAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "FactionWebMapper.ToResponse",
            "domain→response",
            domain, response);

        return response;
    }
}

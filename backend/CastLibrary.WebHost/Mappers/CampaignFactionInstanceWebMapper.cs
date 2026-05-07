using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface ICampaignFactionInstanceWebMapper
{
    CampaignFactionInstanceResponse ToResponse(CampaignFactionInstanceDomain d);
}

public class CampaignFactionInstanceWebMapper(
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignFactionInstanceWebMapper
{
    private const string Ns = "CastLibrary.WebHost.Mappers";

    public CampaignFactionInstanceResponse ToResponse(CampaignFactionInstanceDomain d)
    {
        var response = new CampaignFactionInstanceResponse
        {
            FactionInstanceId  = d.FactionInstanceId,
            SourceFactionId    = d.SourceFactionId,
            CampaignId         = d.CampaignId,
            DmUserId           = d.DmUserId,
            Name               = d.Name,
            Type               = d.Type,
            Influence          = d.Influence,
            Perception         = d.Perception,
            Hidden             = d.Hidden,
            IsVisibleToPlayers = d.IsVisibleToPlayers,
            Description        = d.Description,
            DmNotes            = d.DmNotes,
            SymbolPath             = d.SymbolPath,
            CreatedAt              = d.CreatedAt,
            SubLocationInstanceIds        = d.SubLocationInstanceIds,
            CastInstanceIds               = d.CastInstanceIds,
            PrimarySublocationInstanceId  = d.PrimarySublocationInstanceId,
            PrimaryCastInstanceId         = d.PrimaryCastInstanceId,
            FactionRelationships = d.FactionRelationships.Select(r => new CampaignFactionRelationshipResponse
            {
                Id                 = r.Id,
                CampaignId         = r.CampaignId,
                FactionInstanceIdA = r.FactionInstanceIdA,
                FactionInstanceIdB = r.FactionInstanceIdB,
                RelationshipType   = r.RelationshipType,
                Strength           = r.Strength,
                CreatedAt          = r.CreatedAt,
                DmUserId           = r.DmUserId,
            }).ToList(),
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignFactionInstanceWebMapper.ToResponse",
            "domain?response",
            d, response);

        return response;
    }
}

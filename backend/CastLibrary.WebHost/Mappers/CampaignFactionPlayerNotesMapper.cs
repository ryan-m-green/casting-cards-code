using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface ICampaignFactionPlayerNotesMapper
{
    CampaignFactionPlayerNotesResponse ToResponse(CampaignFactionPlayerNotesDomain domain);
    CampaignFactionPlayerNotesResponse ToEmpty(Guid campaignId, Guid factionInstanceId);
}

public class CampaignFactionPlayerNotesMapper : ICampaignFactionPlayerNotesMapper
{
    public CampaignFactionPlayerNotesResponse ToResponse(CampaignFactionPlayerNotesDomain domain) => new()
    {
        Id                = domain.Id,
        CampaignId        = domain.CampaignId,
        FactionInstanceId = domain.FactionInstanceId,
        Notes             = domain.Notes,
        Influence         = domain.Influence,
        Perception        = domain.Perception,
        CreatedAt         = domain.CreatedAt,
        UpdatedAt         = domain.UpdatedAt,
    };

    public CampaignFactionPlayerNotesResponse ToEmpty(Guid campaignId, Guid factionInstanceId) => new()
    {
        Id                = Guid.Empty,
        CampaignId        = campaignId,
        FactionInstanceId = factionInstanceId,
        Notes             = string.Empty,
        Influence         = null,
        Perception        = null,
        CreatedAt         = DateTime.UtcNow,
        UpdatedAt         = DateTime.UtcNow,
    };
}

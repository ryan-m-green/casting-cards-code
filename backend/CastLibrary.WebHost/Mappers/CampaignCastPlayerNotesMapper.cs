using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ICampaignCastPlayerNotesMapper
    {
        CampaignCastPlayerNotesResponse ToResponse(CampaignCastPlayerNotesDomain domain);
        CampaignCastPlayerNotesResponse ToEmpty(Guid campaignId, Guid castInstanceId);
    }
    public class CampaignCastPlayerNotesMapper : ICampaignCastPlayerNotesMapper
    {
        public CampaignCastPlayerNotesResponse ToResponse(CampaignCastPlayerNotesDomain domain)
        {
            if (domain == null) return null;
            return new CampaignCastPlayerNotesResponse
            {
                Id = domain.Id,
                CampaignId = domain.CampaignId,
                CastInstanceId = domain.CastInstanceId,
                Notes = domain.Notes,
                Connections = domain.Connections,
                Alignment = domain.Alignment,
                Perception = domain.Perception,
                Rating = domain.Rating,
                UpdatedAt = domain.UpdatedAt,
            };
        }

        public CampaignCastPlayerNotesResponse ToEmpty(Guid campaignId, Guid castInstanceId)
        {
            return new CampaignCastPlayerNotesResponse
            {
                Id = Guid.Empty,
                CampaignId = campaignId,
                CastInstanceId = castInstanceId,
                Notes = string.Empty,
                Connections = [],
                Alignment = string.Empty,
                Perception = 0,
                Rating = 0,
                UpdatedAt = default,
            };
        }
    }
}

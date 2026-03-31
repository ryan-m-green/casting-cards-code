using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ICampaignCastPlayerNotesMapper
    {
        CampaignCastPlayerNotesResponse ToResponse(CampaignCastPlayerNotesDomain domain);
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
                Want = domain.Want,
                Connections = domain.Connections,
                Alignment = domain.Alignment,
                Perception = domain.Perception,
                Rating = domain.Rating,
                UpdatedAt = domain.UpdatedAt,
            };
        }
    }
}

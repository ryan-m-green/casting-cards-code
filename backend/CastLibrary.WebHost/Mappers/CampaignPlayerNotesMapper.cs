using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ICampaignPlayerNotesMapper
    {
        CampaignPlayerNotesResponse ToResponse(CampaignPlayerNotesDomain domain);
        CampaignPlayerNotesResponse ToEmpty(Guid campaignId);
    }

    public class CampaignPlayerNotesMapper : ICampaignPlayerNotesMapper
    {
        public CampaignPlayerNotesResponse ToResponse(CampaignPlayerNotesDomain domain)
        {
            if (domain == null) return null;
            return new CampaignPlayerNotesResponse
            {
                Id         = domain.Id,
                CampaignId = domain.CampaignId,
                Notes      = domain.Notes,
            };
        }

        public CampaignPlayerNotesResponse ToEmpty(Guid campaignId)
        {
            return new CampaignPlayerNotesResponse
            {
                Id         = Guid.Empty,
                CampaignId = campaignId,
                Notes      = string.Empty,
            };
        }
    }
}

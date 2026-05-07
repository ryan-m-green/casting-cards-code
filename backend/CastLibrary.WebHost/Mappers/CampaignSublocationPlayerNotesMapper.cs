using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ICampaignSublocationPlayerNotesMapper
    {
        CampaignSublocationPlayerNotesResponse ToResponse(CampaignSublocationPlayerNotesDomain domain);
        CampaignSublocationPlayerNotesResponse ToEmpty(Guid campaignId, Guid sublocationInstanceId);
    }

    public class CampaignSublocationPlayerNotesMapper : ICampaignSublocationPlayerNotesMapper
    {
        public CampaignSublocationPlayerNotesResponse ToResponse(CampaignSublocationPlayerNotesDomain domain)
        {
            if (domain == null) return null;
            return new CampaignSublocationPlayerNotesResponse
            {
                Id                    = domain.Id,
                CampaignId            = domain.CampaignId,
                SublocationInstanceId = domain.SublocationInstanceId,
                Notes                 = domain.Notes,
            };
        }

        public CampaignSublocationPlayerNotesResponse ToEmpty(Guid campaignId, Guid sublocationInstanceId)
        {
            return new CampaignSublocationPlayerNotesResponse
            {
                Id                    = Guid.Empty,
                CampaignId            = campaignId,
                SublocationInstanceId = sublocationInstanceId,
                Notes                 = string.Empty,
            };
        }
    }
}

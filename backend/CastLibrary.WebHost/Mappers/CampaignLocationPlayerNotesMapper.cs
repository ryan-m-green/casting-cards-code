using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ICampaignLocationPlayerNotesMapper
    {
        CampaignLocationPlayerNotesResponse ToResponse(CampaignLocationPlayerNotesDomain domain);
        CampaignLocationPlayerNotesResponse ToEmpty(Guid campaignId, Guid locationInstanceId);
    }

    public class CampaignLocationPlayerNotesMapper : ICampaignLocationPlayerNotesMapper
    {
        public CampaignLocationPlayerNotesResponse ToResponse(CampaignLocationPlayerNotesDomain domain)
        {
            if (domain == null) return null;
            return new CampaignLocationPlayerNotesResponse
            {
                Id                 = domain.Id,
                CampaignId         = domain.CampaignId,
                LocationInstanceId = domain.LocationInstanceId,
                Notes              = domain.Notes,
            };
        }

        public CampaignLocationPlayerNotesResponse ToEmpty(Guid campaignId, Guid locationInstanceId)
        {
            return new CampaignLocationPlayerNotesResponse
            {
                Id                 = Guid.Empty,
                CampaignId         = campaignId,
                LocationInstanceId = locationInstanceId,
                Notes              = string.Empty,
            };
        }
    }
}

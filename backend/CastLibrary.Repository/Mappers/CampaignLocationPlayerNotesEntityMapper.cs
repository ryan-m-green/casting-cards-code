using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers
{
    public interface ICampaignLocationPlayerNotesEntityMapper
    {
        CampaignLocationPlayerNotesDomain ToDomain(CampaignLocationPlayerNotesEntity entity);
    }

    public class CampaignLocationPlayerNotesEntityMapper : ICampaignLocationPlayerNotesEntityMapper
    {
        public CampaignLocationPlayerNotesDomain ToDomain(CampaignLocationPlayerNotesEntity entity)
        {
            return new CampaignLocationPlayerNotesDomain
            {
                Id                 = entity.Id,
                CampaignId         = entity.CampaignId,
                LocationInstanceId = entity.LocationInstanceId,
                Notes              = entity.Notes ?? string.Empty,
                CreatedAt          = entity.CreatedAt,
                UpdatedAt          = entity.UpdatedAt,
            };
        }
    }
}

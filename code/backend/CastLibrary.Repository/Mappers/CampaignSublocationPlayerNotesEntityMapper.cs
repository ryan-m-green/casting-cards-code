using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers
{
    public interface ICampaignSublocationPlayerNotesEntityMapper
    {
        CampaignSublocationPlayerNotesDomain ToDomain(CampaignSublocationPlayerNotesEntity entity);
    }

    public class CampaignSublocationPlayerNotesEntityMapper : ICampaignSublocationPlayerNotesEntityMapper
    {
        public CampaignSublocationPlayerNotesDomain ToDomain(CampaignSublocationPlayerNotesEntity entity)
        {
            return new CampaignSublocationPlayerNotesDomain
            {
                Id                      = entity.Id,
                CampaignId              = entity.CampaignId,
                SublocationInstanceId   = entity.SublocationInstanceId,
                Notes                   = entity.Notes ?? string.Empty,
                CreatedAt               = entity.CreatedAt,
                UpdatedAt               = entity.UpdatedAt,
            };
        }
    }
}

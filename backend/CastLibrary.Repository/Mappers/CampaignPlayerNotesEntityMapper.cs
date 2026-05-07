using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers
{
    public interface ICampaignPlayerNotesEntityMapper
    {
        CampaignPlayerNotesDomain ToDomain(CampaignPlayerNotesEntity entity);
    }

    public class CampaignPlayerNotesEntityMapper : ICampaignPlayerNotesEntityMapper
    {
        public CampaignPlayerNotesDomain ToDomain(CampaignPlayerNotesEntity entity)
        {
            return new CampaignPlayerNotesDomain
            {
                Id         = entity.Id,
                CampaignId = entity.CampaignId,
                Notes      = entity.Notes ?? string.Empty,
                CreatedAt  = entity.CreatedAt,
                UpdatedAt  = entity.UpdatedAt,
            };
        }
    }
}

using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers
{
    public interface ICampaignCastRelationshipEntityMapper
    {
        CampaignCastRelationshipDomain ToDomain(CampaignCastRelationshipEntity entity);
    }
    public class CampaignCastRelationshipEntityMapper : ICampaignCastRelationshipEntityMapper
    {
        public CampaignCastRelationshipDomain ToDomain(CampaignCastRelationshipEntity entity)
        {
            return new CampaignCastRelationshipDomain()
            {
                Id = entity.Id,
                CampaignId = entity.CampaignId,
                SourceCastInstanceId = entity.SourceCastInstanceId,
                TargetCastInstanceId = entity.TargetCastInstanceId,
                Value = entity.Value,
                Explanation = entity.Explanation,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }
    }
}

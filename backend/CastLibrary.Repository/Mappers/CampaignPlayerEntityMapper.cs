using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers
{
    public interface ICampaignPlayerEntityMapper
    {
        CampaignPlayerDomain ToDomain(CampaignPlayerEntity entity);
    }
    public class CampaignPlayerEntityMapper : ICampaignPlayerEntityMapper
    {
        public CampaignPlayerDomain ToDomain(CampaignPlayerEntity entity)
        {
            return new CampaignPlayerDomain
            {
                CampaignId = entity.CampaignId,
                UserId = entity.PlayerUserId,
                DisplayName = entity.DisplayName,
                Email = entity.Email,
                StartingGold = entity.StartingGold,
                JoinedAt = entity.JoinedAt
            };
        }
    }
}

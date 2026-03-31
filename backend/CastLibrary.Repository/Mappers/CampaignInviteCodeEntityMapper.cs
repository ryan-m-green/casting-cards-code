using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers
{
    public interface ICampaignInviteCodeEntityMapper
    {
        CampaignInviteCodeDomain ToDomain(CampaignInviteCodeEntity entity);
        CampaignInviteCodeEntity ToEntity(CampaignInviteCodeDomain domain);
    }
    public class CampaignInviteCodeEntityMapper : ICampaignInviteCodeEntityMapper
    {
        public CampaignInviteCodeDomain ToDomain(CampaignInviteCodeEntity entity)
        {
            return new CampaignInviteCodeDomain()
            {
                CampaignId = entity.CampaignId,
                Code = entity.Code,
                ExpiresAt = entity.ExpiresAt,
            };
        }

        public CampaignInviteCodeEntity ToEntity(CampaignInviteCodeDomain domain)
        {
            return new CampaignInviteCodeEntity()
            {
                CampaignId = domain.CampaignId,
                Code = domain.Code,
                ExpiresAt = domain.ExpiresAt,
            };
        }
    }
}

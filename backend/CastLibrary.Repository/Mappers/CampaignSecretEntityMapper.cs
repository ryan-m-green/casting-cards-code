using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers
{
    public interface ICampaignSecretEntityMapper
    {
        CampaignSecretDomain ToDomain(CampaignSecretEntity entity);
    }
    public class CampaignSecretEntityMapper : ICampaignSecretEntityMapper
    {
        public CampaignSecretDomain ToDomain(CampaignSecretEntity entity)
        {
            return new()
            {
                Id = entity.Id,
                CampaignId = entity.CampaignId,
                CastInstanceId = entity.CastInstanceId,
                CityInstanceId = entity.CityInstanceId,
                LocationInstanceId = entity.LocationInstanceId,
                Content = entity.Content,
                SortOrder = entity.SortOrder,
                IsRevealed = entity.IsRevealed,
                RevealedAt = entity.RevealedAt,
                CreatedAt = entity.CreatedAt,
            };
        }
    }
}

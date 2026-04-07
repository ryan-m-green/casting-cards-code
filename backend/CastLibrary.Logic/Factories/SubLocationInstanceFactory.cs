using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Factories;

public interface ISublocationInstanceFactory
{
    CampaignSublocationInstanceDomain Create(
        SublocationDomain source, Guid campaignId, Guid? cityInstanceId);
}
public class SublocationInstanceFactory : ISublocationInstanceFactory
{
    public CampaignSublocationInstanceDomain Create(
        SublocationDomain source, Guid campaignId, Guid? cityInstanceId)
    {
        var instanceId = Guid.NewGuid();
        return new()
        {
            InstanceId = instanceId,
            CampaignId = campaignId,
            SourceSublocationId = source.Id,
            CityInstanceId = cityInstanceId,
            Name = source.Name,
            Description = source.Description,
            ShopItems = source.ShopItems.Select(s => new ShopItemDomain
            {
                Id = Guid.NewGuid(),
                SublocationId = instanceId,
                Name = s.Name,
                Price = s.Price,
                Description = s.Description,
                SortOrder = s.SortOrder,
            }).ToList(),
        };
    }
}

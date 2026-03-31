using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Factories;

public interface ILocationInstanceFactory
{
    CampaignLocationInstanceDomain Create(
        LocationDomain source, Guid campaignId, Guid? cityInstanceId);
}
public class LocationInstanceFactory : ILocationInstanceFactory
{
    public CampaignLocationInstanceDomain Create(
        LocationDomain source, Guid campaignId, Guid? cityInstanceId)
    {
        var instanceId = Guid.NewGuid();
        return new()
        {
            InstanceId = instanceId,
            CampaignId = campaignId,
            SourceLocationId = source.Id,
            CityInstanceId = cityInstanceId,
            Name = source.Name,
            Description = source.Description,
            ShopItems = source.ShopItems.Select(s => new ShopItemDomain
            {
                Id = Guid.NewGuid(),
                LocationId = instanceId,
                Name = s.Name,
                Price = s.Price,
                Description = s.Description,
                SortOrder = s.SortOrder,
            }).ToList(),
        };
    }
}

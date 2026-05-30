using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Factories;

public interface ISublocationInstanceFactory
{
    CampaignSublocationInstanceDomain Create(
        SublocationDomain source, Guid campaignId, Guid? LocationInstanceId);
}
public class SublocationInstanceFactory(IImageKeyCreator imageKeyCreator, IImageStorageOperator imageStorageOperator) : ISublocationInstanceFactory
{
    public CampaignSublocationInstanceDomain Create(
        SublocationDomain source, Guid campaignId, Guid? LocationInstanceId)
    {
        var imageKey = imageKeyCreator.Create(source.DmUserId, source.Id, EntityType.Sublocation);

        var imageUrl = imageStorageOperator.GetPublicUrl(imageKey);
        var instanceId = Guid.NewGuid();
        return new()
        {
            InstanceId = instanceId,
            CampaignId = campaignId,
            SourceSublocationId = source.Id,
            LocationInstanceId = LocationInstanceId,
            Name = source.Name,
            Description = source.Description,
            ImageUrl = imageUrl,
            ShopItems = source.ShopItems.Select(s => new ShopItemDomain
            {
                Id = Guid.NewGuid(),
                SublocationId = instanceId,
                Name = s.Name,
                PriceAmount = s.PriceAmount,
                PriceCurrencyType = s.PriceCurrencyType,
                Description = s.Description,
                SortOrder = s.SortOrder,
            }).ToList(),
        };
    }
}


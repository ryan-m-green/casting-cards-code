using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
namespace CastLibrary.Logic.Factories;

public interface ILocationInstanceFactory
{
    CampaignLocationInstanceDomain Create(LocationDomain source, Guid campaignId, int sortOrder);
}
public class LocationInstanceFactory(IImageKeyCreator imageKeyCreator, IImageStorageOperator imageStorageOperator) : ILocationInstanceFactory
{

    public CampaignLocationInstanceDomain Create(LocationDomain source, Guid campaignId, int sortOrder)
    {
        var imageKey = imageKeyCreator.Create(source.DmUserId, Guid.Empty, source.Id, EntityType.Location);

        var imageUrl = imageStorageOperator.GetPublicUrl(imageKey);

        return new CampaignLocationInstanceDomain()
        {
            InstanceId = Guid.NewGuid(),
            CampaignId = campaignId,
            SourceLocationId = source.Id,
            Name = source.Name,
            Classification = source.Classification,
            Size = source.Size,
            Condition = source.Condition,
            Geography = source.Geography,
            Architecture = source.Architecture,
            Climate = source.Climate,
            Religion = source.Religion,
            Vibe = source.Vibe,
            Languages = source.Languages,
            Description = source.Description,
            IsVisibleToPlayers = false,
            SortOrder = sortOrder,
            ImageUrl = imageUrl
        };
    }
}



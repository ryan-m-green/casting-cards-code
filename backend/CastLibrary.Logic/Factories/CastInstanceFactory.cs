using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
namespace CastLibrary.Logic.Factories;

public interface ICastInstanceFactory
{
    CampaignCastInstanceDomain Create(CastDomain source, Guid campaignId, Guid? LocationInstanceId, Guid sublocationInstanceId);
}
public class CastInstanceFactory(IImageKeyCreator imageKeyCreator, IImageStorageOperator imageStorageOperator) : ICastInstanceFactory
{
    public CampaignCastInstanceDomain Create(CastDomain source, Guid campaignId, Guid? LocationInstanceId, Guid sublocationInstanceId)
    {
        var imageKey = imageKeyCreator.Create(source.DmUserId, Guid.Empty, source.Id, EntityType.Cast);

        var imageUrl = imageStorageOperator.GetPublicUrl(imageKey);

        return new CampaignCastInstanceDomain()
        {
            InstanceId = Guid.NewGuid(),
            CampaignId = campaignId,
            SourceCastId = source.Id,
            LocationInstanceId = LocationInstanceId,
            SublocationInstanceId = sublocationInstanceId,
            Name = source.Name,
            Pronouns = source.Pronouns,
            Race = source.Race,
            Role = source.Role,
            Age = source.Age,
            Alignment = source.Alignment,
            Posture = source.Posture,
            Speed = source.Speed,
            ImageUrl = imageUrl,
            VoicePlacement = source.VoicePlacement,
            Description = source.Description,
            PublicDescription = source.PublicDescription,
            IsVisibleToPlayers = false
        };
    }
}


using CastLibrary.Shared.Domain;
namespace CastLibrary.Logic.Factories;

public interface ICastInstanceFactory
{
    CampaignCastInstanceDomain Create(CastDomain source, Guid campaignId, Guid? LocationInstanceId, Guid sublocationInstanceId);
}
public class CastInstanceFactory : ICastInstanceFactory
{
    public CampaignCastInstanceDomain Create(CastDomain source, Guid campaignId, Guid? LocationInstanceId, Guid sublocationInstanceId) => new()
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
        VoicePlacement = source.VoicePlacement,
        Description = source.Description,
        PublicDescription = source.PublicDescription,
        IsVisibleToPlayers = false,
    };
}


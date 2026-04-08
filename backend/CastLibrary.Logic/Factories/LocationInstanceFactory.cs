using CastLibrary.Shared.Domain;
namespace CastLibrary.Logic.Factories;

public interface ILocationInstanceFactory
{
    CampaignLocationInstanceDomain Create(LocationDomain source, Guid campaignId, int sortOrder);
}
public class LocationInstanceFactory : ILocationInstanceFactory
{
    public CampaignLocationInstanceDomain Create(LocationDomain source, Guid campaignId, int sortOrder) => new()
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
    };
}



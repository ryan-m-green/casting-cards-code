using CastLibrary.Shared.Domain;
namespace CastLibrary.Logic.Factories;

public interface ICityInstanceFactory
{
    CampaignCityInstanceDomain Create(CityDomain source, Guid campaignId, int sortOrder);
}
public class CityInstanceFactory : ICityInstanceFactory
{
    public CampaignCityInstanceDomain Create(CityDomain source, Guid campaignId, int sortOrder) => new()
    {
        InstanceId = Guid.NewGuid(),
        CampaignId = campaignId,
        SourceCityId = source.Id,
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

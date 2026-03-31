using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Repository.Mappers;

public interface ICampaignEntityMapper
{
    CampaignDomain ToDomain(CampaignEntity entity);
    CampaignEntity ToEntity(CampaignDomain domain);
}

public class CampaignEntityMapper : ICampaignEntityMapper
{
    public CampaignDomain ToDomain(CampaignEntity entity) => new()
    {
        Id = entity.Id,
        DmUserId = entity.DmUserId,
        Name = entity.Name,
        Description = entity.Description ?? string.Empty,
        FantasyType = entity.FantasyType ?? string.Empty,
        Status = Enum.Parse<CampaignStatus>(entity.Status, true),
        SpineColor = entity.SpineColor ?? string.Empty,
        CityCount = entity.CityCount,
        PlayerCount = entity.PlayerCount,
        CreatedAt = entity.CreatedAt,
    };

    public CampaignEntity ToEntity(CampaignDomain domain) => new()
    {
        Id = domain.Id,
        DmUserId = domain.DmUserId,
        Name = domain.Name,
        Description = domain.Description,
        FantasyType = domain.FantasyType,
        Status = domain.Status.ToString(),
        SpineColor = domain.SpineColor,
        CityCount = domain.CityCount,
        PlayerCount = domain.PlayerCount,
        CreatedAt = domain.CreatedAt,
    };
}

using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Services;

public interface IPartyAnchorService
{
    Task CreateAsync(CampaignDomain campaign);
    Task EnsureExistsAsync(CampaignDomain campaign);
}

public class PartyAnchorService(
    ILocationInsertRepository locationInsertRepository,
    ISublocationInsertRepository sublocationInsertRepository,
    ICampaignInsertRepository campaignInsertRepository,
    ICampaignReadRepository campaignReadRepository) : IPartyAnchorService
{
    public async Task CreateAsync(CampaignDomain campaign)
    {
        var locationId       = Guid.NewGuid();
        var sublocationId    = Guid.NewGuid();
        var locInstanceId    = Guid.NewGuid();
        var sublocInstanceId = Guid.NewGuid();
        var now              = DateTime.UtcNow;

        var location = new LocationDomain
        {
            Id         = locationId,
            DmUserId   = campaign.DmUserId,
            Name       = $"The {campaign.Name} Party",
            CampaignId = campaign.Id,
            CreatedAt  = now,
        };
        await locationInsertRepository.InsertAsync(location);

        var sublocation = new SublocationDomain
        {
            Id         = sublocationId,
            LocationId = locationId,
            DmUserId   = campaign.DmUserId,
            Name       = "The Party",
            CreatedAt  = now,
        };
        await sublocationInsertRepository.InsertAsync(sublocation);

        var locationInstance = new CampaignLocationInstanceDomain
        {
            InstanceId         = locInstanceId,
            CampaignId         = campaign.Id,
            SourceLocationId   = locationId,
            Name               = $"The {campaign.Name} Party",
            IsVisibleToPlayers = false,
            SortOrder          = 0,
        };
        await campaignInsertRepository.InsertLocationInstanceAsync(locationInstance);

        var sublocationInstance = new CampaignSublocationInstanceDomain
        {
            InstanceId          = sublocInstanceId,
            CampaignId          = campaign.Id,
            SourceSublocationId = sublocationId,
            LocationInstanceId  = locInstanceId,
            Name                = "The Party",
            ShopItems           = [],
        };
        await campaignInsertRepository.InsertSublocationInstanceAsync(sublocationInstance);
    }

    public async Task EnsureExistsAsync(CampaignDomain campaign)
    {
        var existing = await campaignReadRepository.GetPartySublocationInstanceByCampaignAsync(campaign.Id);
        if (existing is null)
            await CreateAsync(campaign);
    }
}

using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
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
    ICampaignReadRepository campaignReadRepository,
    ICampaignUpdateRepository campaignUpdateRepository) : IPartyAnchorService
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
            Name       = $"{campaign.Name} Party",
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
            Name               = $"{campaign.Name} Party",
            IsVisibleToPlayers = true,
            SortOrder          = 0,
            IsPartyAnchor      = true,
        };
        await campaignInsertRepository.InsertLocationInstanceAsync(locationInstance);

        var sublocationInstance = new CampaignSublocationInstanceDomain
        {
            InstanceId          = sublocInstanceId,
            CampaignId          = campaign.Id,
            SourceSublocationId = sublocationId,
            LocationInstanceId  = locInstanceId,
            Name                = "The Party",
            IsVisibleToPlayers  = true,
            ShopItems           = [],
        };
        await campaignInsertRepository.InsertSublocationInstanceAsync(sublocationInstance);
    }

    public async Task EnsureExistsAsync(CampaignDomain campaign)
    {
        var existing = await campaignReadRepository.GetPartySublocationInstanceByCampaignAsync(campaign.Id);
        if (existing is null)
        {
            await CreateAsync(campaign);
            return;
        }

        if (!existing.IsVisibleToPlayers)
        {
            await campaignUpdateRepository.UpdateSublocationInstanceVisibilityAsync(existing.InstanceId, true);
            if (existing.LocationInstanceId.HasValue)
                await campaignUpdateRepository.UpdateLocationInstanceVisibilityAsync(existing.LocationInstanceId.Value, true);
        }
    }
}

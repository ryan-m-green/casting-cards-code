using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Services;

public interface ICampaignAccessService
{
    /// <summary>Returns true if <paramref name="userId"/> is the DM owner of the campaign.</summary>
    Task<bool> IsOwnerAsync(Guid campaignId, Guid userId);

    /// <summary>Returns true if the caller owns the campaign or is a registered campaign player.</summary>
    Task<bool> IsMemberOrOwnerAsync(Guid campaignId, Guid userId);
}

public class CampaignAccessService(
    ICampaignReadRepository campaignRepository,
    ICampaignPlayerReadRepository playerRepository) : ICampaignAccessService
{
    public async Task<bool> IsOwnerAsync(Guid campaignId, Guid userId)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        return campaign?.DmUserId == userId;
    }

    public async Task<bool> IsMemberOrOwnerAsync(Guid campaignId, Guid userId)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign is null) return false;
        if (campaign.DmUserId == userId) return true;
        return await playerRepository.IsPlayerInCampaignAsync(campaignId, userId);
    }
}

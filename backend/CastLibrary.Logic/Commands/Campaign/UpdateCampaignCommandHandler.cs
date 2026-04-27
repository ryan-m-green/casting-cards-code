using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCampaignCommandHandler
{
    Task<CampaignDomain> HandleAsync(UpdateCampaignCommand command);
}
public class UpdateCampaignCommandHandler(
    ICampaignReadRepository campaignRepository,
    ICampaignUpdateRepository campaignUpdateRepository,
    IPartyAnchorService partyAnchorService) : IUpdateCampaignCommandHandler
{
    public async Task<CampaignDomain> HandleAsync(UpdateCampaignCommand command)
    {
        var campaign = await campaignRepository.GetByIdAsync(command.CampaignId);
        if (campaign is null || campaign.DmUserId != command.UserId) return null;

        campaign.Name        = command.Request.Name;
        campaign.FantasyType = command.Request.FantasyType;
        campaign.Description = command.Request.Description;
        if (!string.IsNullOrEmpty(command.Request.SpineColor))
            campaign.SpineColor = command.Request.SpineColor;

        await campaignUpdateRepository.UpdateAsync(campaign);
        await partyAnchorService.EnsureExistsAsync(campaign);
        return campaign;
    }
}

public class UpdateCampaignCommand
{
    public UpdateCampaignCommand(Guid campaignId, UpdateCampaignRequest request, Guid userId)
    {
        CampaignId = campaignId;
        Request = request;
        UserId = userId;
    }

    public Guid CampaignId { get; }
    public UpdateCampaignRequest Request { get; }
    public Guid UserId { get; }
}

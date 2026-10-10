using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.CampaignRules;

public interface ILinkCampaignRulesCommandHandler
{
    Task<int> HandleAsync(LinkCampaignRulesCommand command);
}

public class LinkCampaignRulesCommandHandler(
    ICampaignRuleLinkInsertRepository linkRepository) : ILinkCampaignRulesCommandHandler
{
    public Task<int> HandleAsync(LinkCampaignRulesCommand command)
        => linkRepository.InsertManyAsync(command.CampaignId, command.DmUserId, command.Request.RuleIds);
}

public class LinkCampaignRulesCommand
{
    public LinkCampaignRulesCommand(Guid campaignId, Guid dmUserId, LinkCampaignRulesRequest request)
    {
        CampaignId = campaignId;
        DmUserId   = dmUserId;
        Request    = request;
    }

    public Guid CampaignId { get; }
    public Guid DmUserId { get; }
    public LinkCampaignRulesRequest Request { get; }
}

using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.CampaignRules;

public interface IUpdateCampaignRuleCommandHandler
{
    Task<CampaignRuleDomain> HandleAsync(UpdateCampaignRuleCommand command);
}

public class UpdateCampaignRuleCommandHandler(
    ICampaignRuleUpdateRepository updateRepository) : IUpdateCampaignRuleCommandHandler
{
    public Task<CampaignRuleDomain> HandleAsync(UpdateCampaignRuleCommand command)
    {
        var domain = new CampaignRuleDomain
        {
            Id         = command.Id,
            DmUserId   = command.DmUserId,
            Name       = command.Request.Name.Trim(),
            Definition = command.Request.Definition ?? string.Empty,
            Children   = CampaignRuleChildren.FromRequests(command.Request.Children),
            Keywords   = CampaignRuleChildren.NormaliseKeywords(command.Request.Keywords),
            UpdatedAt  = DateTime.UtcNow,
        };

        return updateRepository.UpdateAsync(domain);
    }
}

public class UpdateCampaignRuleCommand
{
    public UpdateCampaignRuleCommand(Guid id, Guid dmUserId, UpdateCampaignRuleRequest request)
    {
        Id       = id;
        DmUserId = dmUserId;
        Request  = request;
    }

    public Guid Id { get; }
    public Guid DmUserId { get; }
    public UpdateCampaignRuleRequest Request { get; }
}

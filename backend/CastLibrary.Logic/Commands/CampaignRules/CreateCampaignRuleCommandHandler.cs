using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.CampaignRules;

public static class CampaignRuleChildren
{
    public static List<CampaignRuleDefinition> FromRequests(List<CampaignRuleDefinitionRequest> requests) =>
        [.. requests.Select(request => new CampaignRuleDefinition
        {
            Id         = request.Id is null || request.Id == Guid.Empty ? Guid.NewGuid() : request.Id.Value,
            Name       = request.Name.Trim(),
            Definition = request.Definition ?? string.Empty,
        })];

    public static List<string> NormaliseKeywords(List<string> keywords) =>
        [.. keywords
            .Select(keyword => keyword.Trim().ToLowerInvariant())
            .Where(keyword => keyword.Length > 0)
            .Distinct()];
}

public interface ICreateCampaignRuleCommandHandler
{
    Task<CampaignRuleDomain> HandleAsync(CreateCampaignRuleCommand command);
}

public class CreateCampaignRuleCommandHandler(
    ICampaignRuleInsertRepository insertRepository,
    ICampaignRuleLinkInsertRepository linkRepository) : ICreateCampaignRuleCommandHandler
{
    public async Task<CampaignRuleDomain> HandleAsync(CreateCampaignRuleCommand command)
    {
        var now = DateTime.UtcNow;

        var domain = new CampaignRuleDomain
        {
            Id         = Guid.NewGuid(),
            DmUserId   = command.DmUserId,
            Name       = command.Request.Name.Trim(),
            Definition = command.Request.Definition ?? string.Empty,
            Children   = CampaignRuleChildren.FromRequests(command.Request.Children),
            Keywords   = CampaignRuleChildren.NormaliseKeywords(command.Request.Keywords),
            CreatedAt  = now,
            UpdatedAt  = now,
        };

        var saved = await insertRepository.InsertAsync(domain);

        // An entry written inside a campaign is linked to it; one written from the GM's
        // library stands on its own until a campaign adds it.
        if (command.CampaignId is Guid campaignId && campaignId != Guid.Empty)
            await linkRepository.InsertAsync(campaignId, saved.Id);

        return saved;
    }
}

public class CreateCampaignRuleCommand
{
    public CreateCampaignRuleCommand(Guid? campaignId, Guid dmUserId, CreateCampaignRuleRequest request)
    {
        CampaignId = campaignId;
        DmUserId   = dmUserId;
        Request    = request;
    }

    public Guid? CampaignId { get; }
    public Guid DmUserId { get; }
    public CreateCampaignRuleRequest Request { get; }
}

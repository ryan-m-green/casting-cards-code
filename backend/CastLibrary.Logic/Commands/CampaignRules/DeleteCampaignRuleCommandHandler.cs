using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.CampaignRules;

public interface IDeleteCampaignRuleCommandHandler
{
    Task HandleAsync(DeleteCampaignRuleCommand command);
}

public class DeleteCampaignRuleCommandHandler(
    ICampaignRuleDeleteRepository deleteRepository) : IDeleteCampaignRuleCommandHandler
{
    public Task HandleAsync(DeleteCampaignRuleCommand command)
        => deleteRepository.UnlinkAsync(command.Id, command.CampaignId);
}

public class DeleteCampaignRuleCommand
{
    public DeleteCampaignRuleCommand(Guid id, Guid campaignId)
    {
        Id         = id;
        CampaignId = campaignId;
    }

    public Guid Id { get; }
    public Guid CampaignId { get; }
}

public interface IDeleteLibraryRuleCommandHandler
{
    Task<int> HandleAsync(DeleteLibraryRuleCommand command);
}

/// <summary>Deletes a cheat-sheet entry from the GM's library outright (used by the library page).</summary>
public class DeleteLibraryRuleCommandHandler(
    ICampaignRuleDeleteRepository deleteRepository) : IDeleteLibraryRuleCommandHandler
{
    public Task<int> HandleAsync(DeleteLibraryRuleCommand command)
        => deleteRepository.DeleteAsync(command.RuleId, command.DmUserId);
}

public class DeleteLibraryRuleCommand
{
    public DeleteLibraryRuleCommand(Guid ruleId, Guid dmUserId)
    {
        RuleId   = ruleId;
        DmUserId = dmUserId;
    }

    public Guid RuleId { get; }
    public Guid DmUserId { get; }
}

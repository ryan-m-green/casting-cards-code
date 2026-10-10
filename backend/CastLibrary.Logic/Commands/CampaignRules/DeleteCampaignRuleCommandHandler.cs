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

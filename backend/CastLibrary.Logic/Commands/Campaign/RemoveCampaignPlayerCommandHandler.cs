using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IRemoveCampaignPlayerCommandHandler
{
    Task HandleAsync(RemoveCampaignPlayerCommand command);
}

public class RemoveCampaignPlayerCommandHandler(
    ICampaignPlayerDeleteRepository playerDeleteRepository) : IRemoveCampaignPlayerCommandHandler
{
    public async Task HandleAsync(RemoveCampaignPlayerCommand command)
    {
        await playerDeleteRepository.RemoveCampaignPlayerAsync(command.CampaignId, command.PlayerUserId);
    }
}

public class RemoveCampaignPlayerCommand
{
    public RemoveCampaignPlayerCommand(Guid campaignId, Guid playerUserId)
    {
        CampaignId = campaignId;
        PlayerUserId = playerUserId;
    }
    public Guid CampaignId { get; }
    public Guid PlayerUserId { get; }
}

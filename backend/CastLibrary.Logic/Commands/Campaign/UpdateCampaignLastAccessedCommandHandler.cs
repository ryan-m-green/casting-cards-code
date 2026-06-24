using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCampaignLastAccessedCommandHandler
{
    Task HandleAsync(UpdateCampaignLastAccessedCommand command);
}

public class UpdateCampaignLastAccessedCommandHandler(ICampaignUpdateRepository campaignUpdateRepository)
    : IUpdateCampaignLastAccessedCommandHandler
{
    public async Task HandleAsync(UpdateCampaignLastAccessedCommand command)
    {
        await campaignUpdateRepository.UpdateLastAccessedAtAsync(command.CampaignId);
    }
}

public class UpdateCampaignLastAccessedCommand
{
    public UpdateCampaignLastAccessedCommand(Guid campaignId)
    {
        CampaignId = campaignId;
    }

    public Guid CampaignId { get; }
}

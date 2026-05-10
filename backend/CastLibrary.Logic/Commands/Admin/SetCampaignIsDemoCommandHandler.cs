using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Admin;

public interface ISetCampaignIsDemoCommandHandler
{
    Task HandleAsync(SetCampaignIsDemoCommand command);
}

public class SetCampaignIsDemoCommandHandler(ICampaignUpdateRepository campaignUpdateRepository)
    : ISetCampaignIsDemoCommandHandler
{
    public async Task HandleAsync(SetCampaignIsDemoCommand command)
    {
        await campaignUpdateRepository.SetIsDemoAsync(command.CampaignId, command.IsDemo);
    }
}

public class SetCampaignIsDemoCommand
{
    public SetCampaignIsDemoCommand(Guid campaignId, bool? isDemo)
    {
        CampaignId = campaignId;
        IsDemo = isDemo;
    }

    public Guid CampaignId { get; }
    public bool? IsDemo { get; }
}

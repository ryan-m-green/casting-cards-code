using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.Admin;

public interface IAddUserToDemoCampaignCommandHandler
{
    Task<bool> HandleAsync(AddUserToDemoCampaignCommand command);
}

public class AddUserToDemoCampaignCommandHandler(
    ICampaignReadRepository campaignReadRepository,
    ICampaignPlayerReadRepository playerReadRepository,
    ICampaignPlayerInsertRepository playerInsertRepository) : IAddUserToDemoCampaignCommandHandler
{
    public async Task<bool> HandleAsync(AddUserToDemoCampaignCommand command)
    {
        var campaign = await campaignReadRepository.GetByIdAsync(command.CampaignId);
        if (campaign is null || campaign.IsDemo != true) return false;

        var alreadyJoined = await playerReadRepository.IsPlayerInCampaignAsync(command.CampaignId, command.UserId);
        if (!alreadyJoined)
            await playerInsertRepository.InsertCampaignPlayerAsync(command.CampaignId, command.UserId);

        return true;
    }
}

public class AddUserToDemoCampaignCommand
{
    public AddUserToDemoCampaignCommand(Guid campaignId, Guid userId)
    {
        CampaignId = campaignId;
        UserId = userId;
    }

    public Guid CampaignId { get; }
    public Guid UserId { get; }
}

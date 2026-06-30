using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAssignFactionToSublocationCommandHandler
{
    Task HandleAsync(AssignFactionToSublocationCommand command);
}

public class AssignFactionToSublocationCommandHandler(
    ICampaignUpdateRepository campaignUpdateRepository) : IAssignFactionToSublocationCommandHandler
{
    public async Task HandleAsync(AssignFactionToSublocationCommand command)
    {
        if (command.Request.DmUserId.HasValue)
        {
            await campaignUpdateRepository.UpdateSublocationFactionSymbolAsync(
                command.InstanceId,
                command.Request.FactionInstanceId,
                command.Request.SymbolPath);
        }
        else
        {
            await campaignUpdateRepository.UpdateSublocationPlayerFactionSymbolAsync(
                command.InstanceId,
                command.Request.FactionInstanceId,
                command.Request.SymbolPath);
            await campaignUpdateRepository.SyncPlayerFactionSublocationMembershipAsync(
                command.InstanceId,
                command.Request.FactionInstanceId);
        }
    }
}

public class AssignFactionToSublocationCommand
{
    public AssignFactionToSublocationCommand(Guid campaignId, Guid instanceId, AssignFactionToSublocationRequest request)
    {
        CampaignId = campaignId;
        InstanceId = instanceId;
        Request = request;
    }

    public Guid CampaignId { get; }
    public Guid InstanceId { get; }
    public AssignFactionToSublocationRequest Request { get; }
}

using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateSublocationCastsVisibilityCommandHandler
{
    Task HandleAsync(UpdateSublocationCastsVisibilityCommand command);
}

public class UpdateSublocationCastsVisibilityCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateSublocationCastsVisibilityCommandHandler
{
    public async Task HandleAsync(UpdateSublocationCastsVisibilityCommand command)
    {
        await campaignRepository.UpdateSublocationCastsVisibilityAsync(command.SublocationInstanceId, command.Request.IsVisibleToPlayers);
    }
}

public class UpdateSublocationCastsVisibilityCommand
{
    public UpdateSublocationCastsVisibilityCommand(Guid sublocationInstanceId, UpdateCitySublocationsVisibilityRequest request)
    {
        SublocationInstanceId = sublocationInstanceId;
        Request = request;
    }

    public Guid SublocationInstanceId { get; }
    public UpdateCitySublocationsVisibilityRequest Request { get; }
}

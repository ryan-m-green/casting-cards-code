using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCitySublocationsVisibilityCommandHandler
{
    Task HandleAsync(UpdateCitySublocationsVisibilityCommand command);
}

public class UpdateCitySublocationsVisibilityCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateCitySublocationsVisibilityCommandHandler
{
    public async Task HandleAsync(UpdateCitySublocationsVisibilityCommand command)
    {
        await campaignRepository.UpdateCitySublocationsVisibilityAsync(command.CityInstanceId, command.Request.IsVisibleToPlayers);
    }
}

public class UpdateCitySublocationsVisibilityCommand
{
    public UpdateCitySublocationsVisibilityCommand(Guid cityInstanceId, UpdateCitySublocationsVisibilityRequest request)
    {
        CityInstanceId = cityInstanceId;
        Request = request;
    }

    public Guid CityInstanceId { get; }
    public UpdateCitySublocationsVisibilityRequest Request { get; }
}

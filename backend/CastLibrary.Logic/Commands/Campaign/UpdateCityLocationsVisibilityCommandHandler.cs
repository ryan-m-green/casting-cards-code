using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCityLocationsVisibilityCommandHandler
{
    Task HandleAsync(UpdateCityLocationsVisibilityCommand command);
}

public class UpdateCityLocationsVisibilityCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateCityLocationsVisibilityCommandHandler
{
    public async Task HandleAsync(UpdateCityLocationsVisibilityCommand command)
    {
        await campaignRepository.UpdateCityLocationsVisibilityAsync(command.CityInstanceId, command.Request.IsVisibleToPlayers);
    }
}

public class UpdateCityLocationsVisibilityCommand
{
    public UpdateCityLocationsVisibilityCommand(Guid cityInstanceId, UpdateCityLocationsVisibilityRequest request)
    {
        CityInstanceId = cityInstanceId;
        Request = request;
    }

    public Guid CityInstanceId { get; }
    public UpdateCityLocationsVisibilityRequest Request { get; }
}

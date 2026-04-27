using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface ITravelCastInstanceCommandHandler
{
    Task HandleAsync(TravelCastInstanceCommand command);
}

public class TravelCastInstanceCommandHandler(
    ICampaignUpdateRepository campaignUpdateRepository) : ITravelCastInstanceCommandHandler
{
    public async Task HandleAsync(TravelCastInstanceCommand command)
    {
        await campaignUpdateRepository.TravelCastAsync(
            command.CastInstanceId,
            command.Request.LocationInstanceId,
            command.Request.SublocationInstanceId);
    }
}

public class TravelCastInstanceCommand
{
    public TravelCastInstanceCommand(Guid castInstanceId, TravelCastRequest request)
    {
        CastInstanceId = castInstanceId;
        Request = request;
    }

    public Guid CastInstanceId { get; }
    public TravelCastRequest Request { get; }
}

using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface ITravelCastInstanceCommandHandler
{
    Task<CastTravelDomain> HandleAsync(TravelCastInstanceCommand command);
}

public class TravelCastInstanceCommandHandler(
    ICampaignUpdateRepository campaignUpdateRepository,
    ICampaignReadRepository campaignReadRepository) : ITravelCastInstanceCommandHandler
{
    public async Task<CastTravelDomain> HandleAsync(TravelCastInstanceCommand command)
    {
        await campaignUpdateRepository.TravelCastAsync(
            command.CastInstanceId,
            command.Request.LocationInstanceId,
            command.Request.SublocationInstanceId);
        var partySublocationInstance = await campaignReadRepository.GetPartySublocationInstanceByCampaignAsync(command.CampaignId);
        var isPartySublocation = partySublocationInstance.InstanceId == command.Request.SublocationInstanceId;
        return new CastTravelDomain(isPartySublocation);

    }
}

public class TravelCastInstanceCommand
{
    public TravelCastInstanceCommand(Guid campaignId, Guid castInstanceId, TravelCastRequest request)
    {
        CampaignId = campaignId;
        CastInstanceId = castInstanceId;
        Request = request;
    }
    public Guid CampaignId { get; }
    public Guid CastInstanceId { get; }
    public TravelCastRequest Request { get; }
}

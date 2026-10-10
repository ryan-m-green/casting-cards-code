using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface ITravelCastInstanceCommandHandler
{
    /// <summary>
    /// Moves a campaign's cast card to another sublocation. Null when the card does not exist or
    /// is not that campaign's own, so the caller is told the card is not there rather than told
    /// the travel landed.
    /// </summary>
    Task<CastTravelDomain> HandleAsync(TravelCastInstanceCommand command);
}

public class TravelCastInstanceCommandHandler(
    ICampaignUpdateRepository campaignUpdateRepository,
    ICampaignReadRepository campaignReadRepository) : ITravelCastInstanceCommandHandler
{
    public async Task<CastTravelDomain> HandleAsync(TravelCastInstanceCommand command)
    {
        var instance = await campaignReadRepository.GetCastInstanceByIdAsync(command.CastInstanceId);
        if (instance is null || instance.CampaignId != command.CampaignId) return null;

        await campaignUpdateRepository.TravelCastAsync(
            command.CastInstanceId,
            command.Request.LocationInstanceId,
            command.Request.SublocationInstanceId);

        // Whether the card has landed with the party: a campaign's party anchor is the sublocation
        // instance under its own party location, and a campaign that has none (an older one, or one
        // whose party location was taken away) simply is not where the card went — which is what
        // the `?.` says, rather than an exception over a lookup that found nothing.
        var partySublocationInstance = await campaignReadRepository.GetPartySublocationInstanceByCampaignAsync(command.CampaignId);
        var isPartySublocation = partySublocationInstance?.InstanceId == command.Request.SublocationInstanceId;
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

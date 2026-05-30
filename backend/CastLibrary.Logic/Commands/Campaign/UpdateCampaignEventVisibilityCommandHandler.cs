using CastLibrary.Logic.Strategies;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateStorylineVisibilityCommandHandler
{
    Task<List<EntityVisibilityResult>> HandleAsync(UpdateCampaignEventVisibilityCommand command);
}

public class UpdateCampaignEventVisibilityCommandHandler(
        IEnumerable<IEntityVisibilityUpdater> entityVisibilityUpdaters) : IUpdateStorylineVisibilityCommandHandler
{
    public async Task<List<EntityVisibilityResult>> HandleAsync(UpdateCampaignEventVisibilityCommand command)
    {
        var campaignId = command.CampaignId;
        var resultList = new List<EntityVisibilityResult>();
        foreach (var entity in command.Request.EntityVisibilities)
        {
            var match = entityVisibilityUpdaters.FirstOrDefault(o => o.IsMatch(entity));
            if (match != null)
            {
                var result = await match.Update(campaignId, entity);
                result.TickCount = DateTime.UtcNow.Ticks;
                resultList.Add(result);
            }
        }
        return resultList;
    }

}

public class UpdateCampaignEventVisibilityCommand
{
    public UpdateCampaignEventVisibilityCommand(Guid campaignId, Guid eventId, UpdateCampaignEventVisibilityRequest request)
    {
        EventId = eventId;
        Request = request;
        CampaignId = campaignId;
    }
    public Guid CampaignId { get; }
    public Guid EventId { get; }
    public UpdateCampaignEventVisibilityRequest Request { get; }
}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IArchiveCampaignEventsCommandHandler
{
    Task<int> HandleAsync(ArchiveCampaignEventsCommand command);
}

public class ArchiveCampaignEventsCommandHandler(
    IArchiveCampaignEventsRepository repository,
    IGetTimeOfDayQueryHandler getTimeOfDayQueryHandler) : IArchiveCampaignEventsCommandHandler
{
    public async Task<int> HandleAsync(ArchiveCampaignEventsCommand command)
    {
        var request = command.Request;
        
        // Get current time of day state to calculate slice name and days passed
        var timeOfDay = await getTimeOfDayQueryHandler.HandleAsync(request.CampaignId);
        
        // Days passed is direct from TimeOfDayDomain
        var inGameDay = timeOfDay.DaysPassed;
        
        // Calculate current slice from cursor position
        var todSliceName = CalculateCurrentSliceName(timeOfDay);
        
        return await repository.ArchiveUnlockedEventsAsync(request.CampaignId, todSliceName, inGameDay);
    }
    
    private static string CalculateCurrentSliceName(TimeOfDayDomain timeOfDay)
    {
        if (timeOfDay.Slices == null || timeOfDay.Slices.Count == 0)
            return null;
        
        var cursorHours = (timeOfDay.CursorPositionPercent / 100m) * timeOfDay.DayLengthHours;
        var accumulatedHours = 0m;
        
        foreach (var slice in timeOfDay.Slices.OrderBy(s => s.SortOrder))
        {
            accumulatedHours += slice.DurationHours;
            if (cursorHours <= accumulatedHours)
            {
                return slice.Label;
            }
        }
        
        // If cursor is at 100% or beyond, return the last slice
        return timeOfDay.Slices.OrderByDescending(s => s.SortOrder).First().Label;
    }
}

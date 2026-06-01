using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Session;

public interface IStartSessionCommandHandler
{
    Task<SessionDomain> HandleAsync(StartSessionCommand command);
}

public class StartSessionCommandHandler(
    ISessionInsertRepository sessionInsertRepository,
    ISessionReadRepository sessionReadRepository,
    ITimeOfDayReadRepository timeOfDayReadRepository) : IStartSessionCommandHandler
{
    public async Task<SessionDomain> HandleAsync(StartSessionCommand command)
    {
        // Check if there's already an active session
        var activeSession = await sessionReadRepository.GetActiveSessionByCampaignIdAsync(command.CampaignId);
        if (activeSession != null)
        {
            throw new InvalidOperationException("An active session already exists for this campaign.");
        }

        // Get the last session number for this campaign
        var lastSessionNumber = await sessionReadRepository.GetLastSessionNumberAsync(command.CampaignId);
        var nextSessionNumber = lastSessionNumber.HasValue ? lastSessionNumber.Value + 1 : 1;

        // Get the current in-game day from TimeOfDay
        var timeOfDay = await timeOfDayReadRepository.GetByCampaignIdAsync(command.CampaignId);
        var currentInGameDay = timeOfDay?.DaysPassed ?? 0;

        // Create the session domain with auto-generated title
        var domain = new SessionDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = command.CampaignId,
            SessionNumber = nextSessionNumber,
            Title = $"Session {nextSessionNumber}",
            AlternateTitle = string.Empty,
            StartTime = DateTime.UtcNow,
            StartInGameDay = currentInGameDay,
            IsActive = true,
        };

        return await sessionInsertRepository.InsertAsync(domain);
    }
}

public class StartSessionCommand
{
    public StartSessionCommand(Guid campaignId, StartSessionRequest request)
    {
        CampaignId = campaignId;
        Request = request;
    }

    public Guid CampaignId { get; }
    public StartSessionRequest Request { get; }
}

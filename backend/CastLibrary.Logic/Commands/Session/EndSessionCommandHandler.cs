using CastLibrary.Logic.Commands.CampaignChronicles;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Repository.Services;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Session;

public interface IEndSessionCommandHandler
{
    Task<Guid> HandleAsync(EndSessionCommand command);
}

public class EndSessionCommandHandler(
    ISessionUpdateRepository sessionUpdateRepository,
    ISessionReadRepository sessionReadRepository,
    ICampaignSessionArchivedInsertRepository campaignSessionArchivedInsertRepository,
    IKeywordExtractionService keywordExtractionService,
    IMigrateStorylineToChroniclesCommandHandler migrateStorylineToChroniclesCommand) : IEndSessionCommandHandler
{
    public async Task<Guid> HandleAsync(EndSessionCommand command)
    {
        var activeSession = await sessionReadRepository.GetActiveSessionByCampaignIdAsync(command.CampaignId);
        if (activeSession == null)
            throw new InvalidOperationException("No active session exists for this campaign.");

        // Calculate in_game_days array: all integers from start day to end day inclusive
        var inGameDays = CalculateDayRange(activeSession.StartInGameDay, command.EndDay);
        var title = $"Session {activeSession.SessionNumber}";

        // Create archived session record
        var archivedSession = new CampaignSessionArchivedDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = activeSession.CampaignId,
            SessionNumber = activeSession.SessionNumber,
            StartTime = activeSession.StartTime,
            EndTime = DateTime.UtcNow,
            InGameDays = inGameDays,
            ArchivedAt = DateTime.UtcNow
        };

        archivedSession.Keywords = keywordExtractionService.ExtractSessionKeywords(archivedSession.SessionNumber,
                                                                        title,
                                                                        command.AlternateTitle,
                                                                        archivedSession.StartTime);

        await campaignSessionArchivedInsertRepository.InsertAsync(archivedSession);

        // Migrate storyline events to chronicles
        await migrateStorylineToChroniclesCommand.HandleAsync(new MigrateStorylineToChroniclesCommand(
            command.CampaignId,
            archivedSession.Id
        ));

        // Close the active session
        activeSession.IsActive = false;
        await sessionUpdateRepository.UpdateAsync(activeSession);

        return archivedSession.Id;
    }

    private static int[] CalculateDayRange(int startDay, int endDay)
    {
        if (startDay > endDay)
            throw new ArgumentException("Start day cannot be greater than end day.");

        var range = new int[endDay - startDay + 1];
        for (int i = 0; i < range.Length; i++)
        {
            range[i] = startDay + i;
        }
        return range;
    }
}

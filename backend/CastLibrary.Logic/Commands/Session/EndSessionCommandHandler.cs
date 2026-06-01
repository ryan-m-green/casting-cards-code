using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Session;

public interface IEndSessionCommandHandler
{
    Task HandleAsync(EndSessionCommand command);
}

public class EndSessionCommandHandler(
    ISessionInsertRepository sessionInsertRepository,
    ISessionReadRepository sessionReadRepository,
    ICampaignSessionArchivedInsertRepository campaignSessionArchivedInsertRepository,
    ITransferStorylineToChroniclesRepository transferStorylineToChroniclesRepository) : IEndSessionCommandHandler
{
    public async Task HandleAsync(EndSessionCommand command)
    {
        var activeSession = await sessionReadRepository.GetActiveSessionByCampaignIdAsync(command.CampaignId);
        if (activeSession == null)
            throw new InvalidOperationException("No active session exists for this campaign.");

        // Calculate in_game_days array: all integers from start day to end day inclusive
        var inGameDays = CalculateDayRange(activeSession.StartInGameDay, command.EndDay);

        // Create archived session record
        var archivedSession = new CampaignSessionArchivedDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = activeSession.CampaignId,
            SessionNumber = activeSession.SessionNumber,
            Title = activeSession.Title,
            AlternateTitle = activeSession.AlternateTitle,
            StartTime = activeSession.StartTime,
            EndTime = DateTime.UtcNow,
            InGameDays = inGameDays,
            ArchivedAt = DateTime.UtcNow
        };

        await campaignSessionArchivedInsertRepository.InsertAsync(archivedSession);

        // Transfer unlocked storyline records to chronicles with archived_session_id
        await transferStorylineToChroniclesRepository.TransferUnlockedStorylineToChroniclesAsync(
            command.CampaignId,
            archivedSession.Id
        );

        // Close the active session
        activeSession.IsActive = false;
        await sessionInsertRepository.UpdateAsync(activeSession);
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

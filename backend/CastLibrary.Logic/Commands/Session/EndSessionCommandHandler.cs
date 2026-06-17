using CastLibrary.Repository.Mappers;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Repository.Services;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Session;

public interface IEndSessionCommandHandler
{
    Task HandleAsync(EndSessionCommand command);
}

public class EndSessionCommandHandler(
    ISessionUpdateRepository sessionUpdateRepository,
    ISessionReadRepository sessionReadRepository,
    ICampaignSessionArchivedInsertRepository campaignSessionArchivedInsertRepository,
    IStorylineReadRepository storylineReadRepository,
    ICampaignSessionChroniclesInsertRepository chroniclesInsertRepository,
    ICampaignEventDeleteRepository campaignEventDeleteRepository,
    IKeywordExtractionService keywordExtractionService) : IEndSessionCommandHandler
{
    public async Task HandleAsync(EndSessionCommand command)
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

        // Query storyline events to move (CQRS: query in handler)
        var eventsToMove = await storylineReadRepository.GetByCampaignIdAsync(command.CampaignId, true, true);

        // Controlled concurrency: limit to 4 concurrent keyword extractions
        var semaphore = new SemaphoreSlim(4);
        var keywordTasks = eventsToMove.Select(async evt =>
        {
            await semaphore.WaitAsync();
            try
            {
                var linkedEntitiesJson = CampaignEventEntityMapper.ToJson(evt.LinkedEntities);
                var keywords = await keywordExtractionService.ExtractChronicleKeywordsAsync(
                    evt.Title,
                    evt.Body,
                    null,
                    linkedEntitiesJson);
                return (Event: evt, Keywords: keywords);
            }
            finally
            {
                semaphore.Release();
            }
        });

        var results = await Task.WhenAll(keywordTasks);

        // Insert chronicles with extracted keywords
        foreach (var (evt, keywords) in results)
        {
            var chronicleDomain = new CampaignSessionChroniclesDomain
            {
                Id = Guid.NewGuid(),
                CampaignId = evt.CampaignId,
                ArchivedSessionId = archivedSession.Id,
                Title = evt.Title,
                Body = evt.Body,
                SortOrder = evt.SortOrder,
                LinkedEntities = evt.LinkedEntities,
                FilePath = evt.FilePath,
                TodSliceName = null,
                ArchivedAt = DateTime.UtcNow,
                CreatedAt = evt.CreatedAt,
                UpdatedAt = evt.UpdatedAt,
                Keywords = keywords,
                IsGmOnly = evt.VisibleToPlayers == false
            };

            await chroniclesInsertRepository.InsertAsync(chronicleDomain);
        }

        // Delete from storyline (repository operation)
        await campaignEventDeleteRepository.DeleteByCampaignAsync(command.CampaignId, true, true);

        // Close the active session
        activeSession.IsActive = false;
        await sessionUpdateRepository.UpdateAsync(activeSession);
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

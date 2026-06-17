using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Services;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IArchiveSessionChroniclesCommandHandler
{
    Task<int> HandleAsync(ArchiveSessionChroniclesCommand command);
}

public class ArchiveSessionChroniclesCommandHandler(
    IStorylineReadRepository storylineReadRepository,
    ICampaignSessionChroniclesInsertRepository chroniclesInsertRepository,
    ICampaignEventDeleteRepository campaignEventDeleteRepository,
    IKeywordExtractionService keywordExtractionService) : IArchiveSessionChroniclesCommandHandler
{
    public async Task<int> HandleAsync(ArchiveSessionChroniclesCommand command)
    {
        var request = command.Request;

        // Query storyline events to move (CQRS: query in handler)
        var storylineEvents = await storylineReadRepository.GetVisibleByCampaignIdAsync(request.CampaignId);
        var eventsToMove = storylineEvents
            .Where(e => e.LinkedEntities != null && e.LinkedEntities.Count > 0)
            .ToList();

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
        foreach (var result in results)
        {
            var chronicleDomain = new CampaignSessionChroniclesDomain
            {
                Id = Guid.NewGuid(),
                CampaignId = result.Event.CampaignId,
                Title = result.Event.Title,
                Body = result.Event.Body,
                SortOrder = result.Event.SortOrder,
                LinkedEntities = result.Event.LinkedEntities,
                FilePath = result.Event.FilePath,
                TodSliceName = null,
                ArchivedAt = DateTime.UtcNow,
                CreatedAt = result.Event.CreatedAt,
                UpdatedAt = result.Event.UpdatedAt,
                Keywords = result.Keywords
            };

            await chroniclesInsertRepository.InsertAsync(chronicleDomain);
        }

        // Delete from storyline (repository operation)
        await campaignEventDeleteRepository.DeleteByCampaignAsync(request.CampaignId, true, true);

        return results.Length;
    }
}

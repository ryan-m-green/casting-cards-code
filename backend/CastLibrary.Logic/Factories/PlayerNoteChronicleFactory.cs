using CastLibrary.Repository.Services;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Factories;

public interface IPlayerNoteChronicleFactory
{
    Task<List<CampaignSessionChroniclesDomain>> CreateChroniclesAsync(
        List<PlayerNoteDomain> playerNotes,
        Guid archivedSessionId,
        int startingSortOrder);
}

public class PlayerNoteChronicleFactory(IKeywordExtractionService keywordExtractionService) : IPlayerNoteChronicleFactory
{
    public async Task<List<CampaignSessionChroniclesDomain>> CreateChroniclesAsync(
        List<PlayerNoteDomain> playerNotes,
        Guid archivedSessionId,
        int startingSortOrder)
    {
        if (playerNotes == null || !playerNotes.Any())
            return new List<CampaignSessionChroniclesDomain>();

        // Controlled concurrency: limit to 4 concurrent keyword extractions
        var semaphore = new SemaphoreSlim(4);
        var currentSortOrder = startingSortOrder;
        var tasks = playerNotes.Select(async note =>
        {
            await semaphore.WaitAsync();
            try
            {
                var linkedEntities = new List<LinkedEntityTrigger>
                {
                    new LinkedEntityTrigger
                    {
                        EntityId = note.EntityId?.ToString() ?? string.Empty,
                        EntityName = note.EntityName,
                        EntityType = note.EntityType,
                        TodPositionPercent = null
                    },
                    new LinkedEntityTrigger
                    {
                        EntityId = null,
                        EntityName = "Player Note",
                        EntityType = "player-note"
                    }
                };

                var keywords = await keywordExtractionService.ExtractChronicleKeywordsAsync(
                    note.EntityName,
                    note.Notes,
                    null,
                    linkedEntities);

                var sortOrder = currentSortOrder++;
                return new CampaignSessionChroniclesDomain
                {
                    Id = Guid.NewGuid(),
                    CampaignId = note.CampaignId,
                    ArchivedSessionId = archivedSessionId,
                    Title = note.EntityName,
                    Body = note.Notes,
                    SortOrder = sortOrder,
                    LinkedEntities = linkedEntities,
                    FilePath = null,
                    TodSliceName = null,
                    ArchivedAt = DateTime.UtcNow,
                    CreatedAt = note.CreatedAt,
                    UpdatedAt = note.UpdatedAt,
                    Keywords = keywords,
                    IsGmOnly = false
                };
            }
            finally
            {
                semaphore.Release();
            }
        });

        var results = await Task.WhenAll(tasks);
        return results.ToList();
    }
}

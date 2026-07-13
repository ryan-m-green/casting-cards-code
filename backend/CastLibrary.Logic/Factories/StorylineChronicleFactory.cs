using CastLibrary.Repository.Services;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Factories;

public interface IStorylineChronicleFactory
{
    Task<List<CampaignSessionChroniclesDomain>> CreateChroniclesAsync(
        List<CampaignStorylineDomain> storylineItems,
        Guid archivedSessionId);
}

public class StorylineChronicleFactory(IKeywordExtractionService keywordExtractionService) : IStorylineChronicleFactory
{
    private const string _handout = "campaign-handout";

    public async Task<List<CampaignSessionChroniclesDomain>> CreateChroniclesAsync(
        List<CampaignStorylineDomain> storylineItems,
        Guid archivedSessionId)
    {
        if (storylineItems == null || !storylineItems.Any())
            return new List<CampaignSessionChroniclesDomain>();

        // Controlled concurrency: limit to 4 concurrent keyword extractions
        var semaphore = new SemaphoreSlim(4);
        var tasks = storylineItems.Select(async evt =>
        {
            await semaphore.WaitAsync();
            try
            {
                // Ensure LinkedEntities exists and handle handout scenario
                if (evt.LinkedEntities == null || !evt.LinkedEntities.Any() || evt.SceneType == _handout)
                {
                    if (evt.LinkedEntities == null)
                    {
                        evt.LinkedEntities = new List<LinkedEntityTrigger>();
                    }
                    evt.LinkedEntities.Add(new LinkedEntityTrigger()
                    {
                        EntityId = string.Empty,
                        EntityName = evt.SceneType == EntityType.CampaignHandout.GetDescription() ? "Handout" : evt.SceneType,
                        EntityType = evt.SceneType
                    });
                }

                var keywords = await keywordExtractionService.ExtractChronicleKeywordsAsync(
                    evt.Title,
                    evt.Body,
                    null,
                    evt.LinkedEntities);

                return new CampaignSessionChroniclesDomain
                {
                    Id = Guid.NewGuid(),
                    CampaignId = evt.CampaignId,
                    ArchivedSessionId = archivedSessionId,
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

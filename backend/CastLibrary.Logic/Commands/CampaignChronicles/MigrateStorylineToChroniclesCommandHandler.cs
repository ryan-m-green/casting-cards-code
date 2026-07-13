using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Queries.PlayerNotes;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

public interface IMigrateStorylineToChroniclesCommandHandler
{
    Task HandleAsync(MigrateStorylineToChroniclesCommand command);
}

public class MigrateStorylineToChroniclesCommandHandler(
    IStorylineReadRepository storylineReadRepository,
    ICampaignSessionChroniclesInsertRepository chroniclesInsertRepository,
    ICampaignEventDeleteRepository campaignEventDeleteRepository,
    IStorylineChronicleFactory storylineChronicleFactory,
    IPlayerNoteChronicleFactory playerNoteChronicleFactory,
    IGetAllPlayerNotesQueryHandler getAllPlayerNotesQueryHandler,
    IPlayerNotesDeleteRepository playerNotesDeleteRepository) : IMigrateStorylineToChroniclesCommandHandler
{
    public async Task HandleAsync(MigrateStorylineToChroniclesCommand command)
    {
        // Query storyline events to move
        var storylineItemsToMove = await storylineReadRepository.GetByCampaignIdAsync(command.CampaignId, true, true);

        // Query all player notes
        var playerNotes = await getAllPlayerNotesQueryHandler.HandleAsync(new GetAllPlayerNotesQuery(command.CampaignId));

        // Filter out player notes with empty Notes - exclude from factory but still delete from tables
        var playerNotesForFactory = playerNotes.Where(pn => !string.IsNullOrWhiteSpace(pn.Notes)).ToList();

        // Calculate sort orders: storyline items keep existing, player notes start after max storyline sortOrder
        var playerNoteSortOrder = storylineItemsToMove.Count() + 1;

        // Call both factories simultaneously
        var storylineTask = storylineChronicleFactory.CreateChroniclesAsync(storylineItemsToMove, command.ArchivedSessionId);
        var playerNoteTask = playerNoteChronicleFactory.CreateChroniclesAsync(playerNotesForFactory, command.ArchivedSessionId, playerNoteSortOrder);

        var results = await Task.WhenAll(storylineTask, playerNoteTask);
        var storylineChronicles = results[0];
        var playerNoteChronicles = results[1];

        // Combine results into single list
        var allChronicles = storylineChronicles.Concat(playerNoteChronicles).ToList();

        // Insert all chronicles to database
        foreach (var chronicle in allChronicles)
        {
            await chroniclesInsertRepository.InsertAsync(chronicle);
        }

        // Delete from storyline (repository operation)
        await campaignEventDeleteRepository.DeleteByCampaignAsync(command.CampaignId, true, true);

        // Delete all player notes after successful migration
        await playerNotesDeleteRepository.DeleteAllPlayerNotesAsync(command.CampaignId);
    }
}

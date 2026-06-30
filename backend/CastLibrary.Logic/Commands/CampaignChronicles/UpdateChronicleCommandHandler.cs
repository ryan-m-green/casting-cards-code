using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Repository.Services;
using CastLibrary.Shared.Domain;
using System.Text.Json;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

public interface IUpdateChronicleCommandHandler
{
    Task<bool> HandleAsync(UpdateChronicleCommand command);
}

public class UpdateChronicleCommandHandler(
    ICampaignChroniclesUpdateRepository repository,
    ICampaignChroniclesReadRepository readRepository,
    IKeywordExtractionService keywordExtractionService) : IUpdateChronicleCommandHandler
{
    public async Task<bool> HandleAsync(UpdateChronicleCommand command)
    {        
        // Get current linked entities for keyword extraction
        var linkedEntitiesJson = await readRepository.GetLinkedEntitiesAsync(command.ChronicleId);

        var linkedEntities = JsonSerializer.Deserialize<List<LinkedEntityTrigger>>(linkedEntitiesJson) ?? new List<LinkedEntityTrigger>();

        // Extract keywords (business logic)
        var keywords = await keywordExtractionService.ExtractChronicleKeywordsAsync(
            command.Request.Title,
            command.Request.Body,
            null,
            linkedEntities);
        
        return await repository.UpdateAsync(
            command.ChronicleId,
            command.Request.Title,
            command.Request.Body,
            command.Request.SessionId,
            command.Request.SortOrder,
            keywords
        );
    }
}

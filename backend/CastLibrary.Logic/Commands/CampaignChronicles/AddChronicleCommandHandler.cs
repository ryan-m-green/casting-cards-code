using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Services;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

public interface IAddChronicleCommandHandler
{
    Task<Guid> HandleAsync(AddChronicleCommand command);
}

/// <summary>
/// Orchestrates a v2 chronicle add: picks the strategy for the requested content
/// type, finalizes the row (ids, dates, keywords), and persists a COPY (source rows
/// are never deleted by this flow).
/// </summary>
public class AddChronicleCommandHandler(
    IEnumerable<IChronicleArchiveStrategy> strategies,
    ICampaignChroniclesInsertRepository chroniclesInsertRepository,
    IKeywordExtractionService keywordExtractionService,
    IChronicleMapper chronicleMapper) : IAddChronicleCommandHandler
{
    public async Task<Guid> HandleAsync(AddChronicleCommand command)
    {
        var request = command.Request;

        var strategy = strategies.FirstOrDefault(s => s.Supports(request.ContentType))
            ?? throw new ArgumentException($"Unsupported chronicle content type: {request.ContentType}.");

        var now = DateTime.UtcNow;
        var domain = await strategy.BuildAsync(command.CampaignId, request);

        if (string.IsNullOrWhiteSpace(domain.Title) || domain.Title.Length > 200)
            throw new ArgumentException("Title is required and must not exceed 200 characters.");

        if (domain.Body.Length > 50000)
            throw new ArgumentException("Body must not exceed 50000 characters.");

        if (domain.LinkedEntities.Count == 0)
        {
            domain.LinkedEntities.Add(new LinkedEntityTrigger
            {
                EntityType = domain.ContentType,
                EntityId = domain.SourceId?.ToString() ?? string.Empty,
                EntityName = chronicleMapper.ToLabel(request.ContentType)
            });
        }

        domain.Id = Guid.NewGuid();
        domain.CampaignId = command.CampaignId;
        domain.PlayedOn = domain.PlayedOn == default ? now.Date : domain.PlayedOn.Date;
        domain.SortOrder = 0;
        domain.ArchivedAt = now;
        domain.CreatedAt = now;
        domain.UpdatedAt = now;

        domain.Keywords = await keywordExtractionService.ExtractChronicleKeywordsAsync(
            domain.Title,
            domain.Body,
            domain.TodSliceName,
            domain.LinkedEntities);

        var inserted = await chroniclesInsertRepository.InsertAsync(domain);
        return inserted.Id;
    }
}

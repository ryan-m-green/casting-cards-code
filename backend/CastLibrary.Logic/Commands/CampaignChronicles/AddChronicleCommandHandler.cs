using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
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
    IChronicleMapper chronicleMapper,
    ITimeOfDayReadRepository timeOfDayReadRepository) : IAddChronicleCommandHandler
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

        // Stamp the campaign clock (the cc-day-counter's own day and the time-of-day slice its cursor
        // sits in) at the moment of storage, so the entry keeps the in-game when it was recorded at
        // rather than whatever the caller happened to send.
        var timeOfDay = await timeOfDayReadRepository.GetByCampaignIdAsync(command.CampaignId);
        domain.DayNumber = timeOfDay?.DaysPassed ?? 0;
        domain.TodSliceName = ResolveCurrentSliceLabel(timeOfDay);

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

    /// <summary>
    /// The label of the slice the campaign clock's cursor currently sits in, mirroring the
    /// percentages the API publishes (see TimeOfDayController's ToResponse). Empty when the
    /// campaign has no day/night cycle configured.
    /// </summary>
    private static string ResolveCurrentSliceLabel(TimeOfDayDomain timeOfDay)
    {
        if (timeOfDay is null || timeOfDay.Slices.Count == 0) return string.Empty;

        var total = timeOfDay.Slices.Sum(s => s.DurationHours);
        if (total <= 0) return timeOfDay.Slices[0].Label;

        var percent = timeOfDay.CursorPositionPercent;
        decimal running = 0;

        foreach (var slice in timeOfDay.Slices)
        {
            running += slice.DurationHours;
            if (percent < running / total * 100) return slice.Label;
        }

        return timeOfDay.Slices[^1].Label;
    }
}

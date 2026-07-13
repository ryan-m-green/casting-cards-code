using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using System.Text.Json;

namespace CastLibrary.Logic.Commands.PlayerNotes;

public interface IMigratePlayerNoteToChronicleCommandHandler
{
    Task<Guid> HandleAsync(MigratePlayerNoteToChronicleCommand command);
}

public class MigratePlayerNoteToChronicleCommandHandler(
    ICampaignSessionChroniclesReadRepository chroniclesReadRepository,
    ICampaignSessionChroniclesInsertRepository chroniclesInsertRepository,
    ICastPlayerNotesUpdateRepository castPlayerNotesUpdateRepository,
    ILocationPlayerNotesUpdateRepository locationPlayerNotesUpdateRepository,
    ISublocationPlayerNotesUpdateRepository sublocationPlayerNotesUpdateRepository,
    IFactionPlayerNotesUpdateRepository factionPlayerNotesUpdateRepository,
    ICampaignPlayerNotesUpdateRepository campaignPlayerNotesUpdateRepository,
    ICampaignSessionArchivedReadRepository campaignSessionArchivedReadRepository)
    : IMigratePlayerNoteToChronicleCommandHandler
{
    public async Task<Guid> HandleAsync(MigratePlayerNoteToChronicleCommand command)
    {
        // Validate that the archived session exists and belongs to the campaign
        var archivedSessions = await campaignSessionArchivedReadRepository.GetByCampaignIdAsync(command.CampaignId);
        var archivedSession = archivedSessions.FirstOrDefault(s => s.Id == command.SessionId);
        if (archivedSession == null)
        {
            throw new ArgumentException("Archived session not found.");
        }

        if (archivedSession.CampaignId != command.CampaignId)
        {
            throw new ArgumentException("Archived session does not belong to this campaign.");
        }

        // Query max sortOrder for that session to determine next sort order
        var chronicles = await chroniclesReadRepository.GetBySessionIdAsync(command.SessionId);
        var maxSortOrder = chronicles.Any() ? chronicles.Max(c => c.SortOrder) : 0;
        var nextSortOrder = maxSortOrder + 1;

        // Create chronicle entry with LinkedEntities structure
        var linkedEntities = new List<LinkedEntityTrigger>
        {
            new()
            {
                EntityId = command.EntityId?.ToString() ?? string.Empty,
                EntityName = GetEntityTypeName(command.EntityType),
                EntityType = command.EntityType,
                TodPositionPercent = null
            },
            new()
            {
                EntityId = null,
                EntityName = "Player Note",
                EntityType = "player-note"
            }
        };

        var chronicleDomain = new CampaignSessionChroniclesDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = command.CampaignId,
            ArchivedSessionId = command.SessionId,
            Title = command.EntityName,
            Body = command.Notes,
            SortOrder = nextSortOrder,
            LinkedEntities = linkedEntities,
            FilePath = null,
            TodSliceName = null,
            ArchivedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Keywords = Array.Empty<string>(),
            IsGmOnly = false
        };

        await chroniclesInsertRepository.InsertAsync(chronicleDomain);

        // Delete note from the appropriate player notes table
        await DeletePlayerNoteAsync(command);

        return chronicleDomain.Id;
    }

    private static string GetEntityTypeName(string entityType)
    {
        return entityType.ToLower() switch
        {
            "cast" => "Cast",
            "location" => "Location",
            "sublocation" => "Sublocation",
            "faction" => "Faction",
            "campaign" => "Campaign",
            _ => entityType
        };
    }

    private async Task DeletePlayerNoteAsync(MigratePlayerNoteToChronicleCommand command)
    {
        // Delete from the appropriate player notes table based on entity type
        switch (command.EntityType.ToLower())
        {
            case "cast" when command.EntityId.HasValue:
                await castPlayerNotesUpdateRepository.DeleteAsync(command.CampaignId, command.EntityId.Value);
                break;
            case "location" when command.EntityId.HasValue:
                await locationPlayerNotesUpdateRepository.DeleteAsync(command.CampaignId, command.EntityId.Value);
                break;
            case "sublocation" when command.EntityId.HasValue:
                await sublocationPlayerNotesUpdateRepository.DeleteAsync(command.CampaignId, command.EntityId.Value);
                break;
            case "faction" when command.EntityId.HasValue:
                await factionPlayerNotesUpdateRepository.DeleteAsync(command.CampaignId, command.EntityId.Value);
                break;
            case "campaign":
                await campaignPlayerNotesUpdateRepository.DeleteAsync(command.CampaignId);
                break;
        }
    }
}

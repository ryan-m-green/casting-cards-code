namespace CastLibrary.Logic.Commands.PlayerNotes;

public record MigratePlayerNoteToChronicleCommand(
    Guid CampaignId,
    Guid SessionId,
    string EntityType,
    Guid? EntityId,
    string EntityName,
    string Notes
);

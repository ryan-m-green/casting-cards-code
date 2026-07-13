namespace CastLibrary.Shared.Requests;

public class MigratePlayerNoteToChronicleRequest
{
    public Guid SessionId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}

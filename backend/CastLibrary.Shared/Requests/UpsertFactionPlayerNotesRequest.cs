namespace CastLibrary.Shared.Requests;

public class UpsertFactionPlayerNotesRequest
{
    public string Notes { get; set; } = string.Empty;
    public short? Influence { get; set; }
    public short? Perception { get; set; }
}

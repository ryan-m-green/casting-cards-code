namespace CastLibrary.Shared.Requests;

public class UpdateSublocationInstanceRequest
{
    public string Name        { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DmNotes     { get; set; } = string.Empty;
    public bool   SyncLibrary { get; set; } = false;
}

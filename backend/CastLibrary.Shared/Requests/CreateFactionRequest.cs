namespace CastLibrary.Shared.Requests;

public class CreateFactionRequest
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public short Influence { get; set; } = 0;
    public short Perception { get; set; } = 0;
    public bool Hidden { get; set; }
    public string Description { get; set; }
    public string DmNotes { get; set; }
    public string SymbolPath { get; set; }
}

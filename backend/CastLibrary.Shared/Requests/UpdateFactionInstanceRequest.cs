namespace CastLibrary.Shared.Requests;

public class UpdateFactionInstanceRequest
{
    public string Name        { get; set; } = string.Empty;
    public string Type        { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool   Hidden      { get; set; } = false;
    public string DmNotes     { get; set; } = string.Empty;
    public short  Influence   { get; set; } = 0;
    public short  Perception  { get; set; } = 0;
    public bool   SyncLibrary { get; set; } = false;
    public FactionColorsRequest? Colors { get; set; }
}

public class FactionColorsRequest
{
    public string GoodColor { get; set; } = string.Empty;
    public string EvilColor { get; set; } = string.Empty;
}

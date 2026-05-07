namespace CastLibrary.Shared.Requests;

public class FactionSymbolEntry
{
    public string FactionInstanceId { get; set; } = string.Empty;
    public string SymbolPath { get; set; } = string.Empty;
}

public class AssignFactionToCastRequest
{
    public List<FactionSymbolEntry> FactionSymbols { get; set; } = [];
    public Guid? DmUserId { get; set; }
}

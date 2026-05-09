namespace CastLibrary.Shared.Requests;

public class AssignFactionToSublocationRequest
{
    public Guid? FactionInstanceId { get; set; }
    public string SymbolPath { get; set; }
    public Guid? DmUserId { get; set; }
}

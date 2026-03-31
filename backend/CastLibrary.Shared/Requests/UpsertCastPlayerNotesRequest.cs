namespace CastLibrary.Shared.Requests;

public class UpsertCastPlayerNotesRequest
{
    public string Want { get; set; } = string.Empty;
    public List<Guid> Connections { get; set; } = [];
    public string Alignment { get; set; } = string.Empty;
    public int Perception { get; set; }
    public int Rating { get; set; }
}

namespace CastLibrary.Shared.Requests;

public class UpdateChronicleRequest
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public Guid SessionId { get; set; }
    public int SortOrder { get; set; }
}

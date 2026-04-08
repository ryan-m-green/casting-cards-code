namespace CastLibrary.Shared.Requests;

public class UpdateLocationInstanceRequest
{
    public string Description    { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public string Size           { get; set; } = string.Empty;
    public string Condition      { get; set; } = string.Empty;
    public string Geography      { get; set; } = string.Empty;
    public string Architecture   { get; set; } = string.Empty;
    public string Climate        { get; set; } = string.Empty;
    public string Religion       { get; set; } = string.Empty;
    public string Vibe           { get; set; } = string.Empty;
    public string Languages      { get; set; } = string.Empty;
    public string DmNotes        { get; set; } = string.Empty;
}

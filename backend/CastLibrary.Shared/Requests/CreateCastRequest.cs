namespace CastLibrary.Shared.Requests;

public class CreateCastRequest
{
    public string Name { get; set; } = string.Empty;
    public string Pronouns { get; set; } = string.Empty;
    public string Race { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Age { get; set; } = string.Empty;
    public string Alignment { get; set; } = string.Empty;
    public string Posture { get; set; } = string.Empty;
    public string Speed { get; set; } = string.Empty;
    public string[] VoicePlacement { get; set; } = [];
    public string Description { get; set; } = string.Empty;
    public string PublicDescription { get; set; } = string.Empty;
}

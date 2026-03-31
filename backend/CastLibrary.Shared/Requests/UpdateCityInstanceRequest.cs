namespace CastLibrary.Shared.Requests;

public class UpdateCityInstanceRequest
{
    public string Condition { get; set; } = string.Empty;
    public string Geography { get; set; } = string.Empty;
    public string Climate   { get; set; } = string.Empty;
    public string Religion  { get; set; } = string.Empty;
    public string Vibe      { get; set; } = string.Empty;
    public string Languages { get; set; } = string.Empty;
}

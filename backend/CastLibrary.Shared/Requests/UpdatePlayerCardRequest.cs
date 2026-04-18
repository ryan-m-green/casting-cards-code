namespace CastLibrary.Shared.Requests;

public class UpdatePlayerCardRequest
{
    public string Name { get; set; } = string.Empty;
    public string Race { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public string? Description { get; set; }
}

namespace CastLibrary.Shared.Requests;

public class UpdateSoundtrackRequest
{
    public string Title { get; set; } = string.Empty;
    public int Volume { get; set; } = 80;
    public bool IsLoop { get; set; }
    public int? LoopDelaySeconds { get; set; }
    public string Kind { get; set; } = "music";
}

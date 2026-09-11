namespace CastLibrary.Logic.Commands.Ambiance;

public class AmbianceItemInput
{
    public Guid SoundtrackId { get; set; }
    public int Volume { get; set; } = 80;
    public string PauseMode { get; set; } = "none";
    public int? PauseDelaySeconds { get; set; }
    public int? PauseMinSeconds { get; set; }
    public int? PauseMaxSeconds { get; set; }
}

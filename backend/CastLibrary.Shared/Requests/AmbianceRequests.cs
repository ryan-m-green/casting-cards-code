namespace CastLibrary.Shared.Requests;

public class AmbianceItemRequest
{
    public Guid SoundtrackId { get; set; }
    public int Volume { get; set; } = 80;
    public string PauseMode { get; set; } = "none";
    public int? PauseDelaySeconds { get; set; }
    public int? PauseMinSeconds { get; set; }
    public int? PauseMaxSeconds { get; set; }
}

public class CreateAmbianceRequest
{
    public string Title { get; set; } = string.Empty;
    public bool RandomizeMusic { get; set; }
    public List<AmbianceItemRequest> Items { get; set; } = [];
}

public class UpdateAmbianceRequest
{
    public string Title { get; set; } = string.Empty;
    public bool RandomizeMusic { get; set; }
    public List<AmbianceItemRequest> Items { get; set; } = [];
}

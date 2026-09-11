namespace CastLibrary.Shared.Entities;

public class AmbianceEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool RandomizeMusic { get; set; }
}

public class AmbianceItemEntity
{
    public Guid Id { get; set; }
    public Guid AmbianceId { get; set; }
    public Guid SoundtrackId { get; set; }
    public int SortOrder { get; set; }
    public int Volume { get; set; } = 80;
    public string PauseMode { get; set; } = "none";
    public int? PauseDelaySeconds { get; set; }
    public int? PauseMinSeconds { get; set; }
    public int? PauseMaxSeconds { get; set; }
}

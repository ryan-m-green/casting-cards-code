namespace CastLibrary.Shared.Entities;

public class SoundtrackEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public int Volume { get; set; } = 80;
    public bool IsLoop { get; set; }
    public int? LoopDelaySeconds { get; set; }
    public DateTime CreatedAt { get; set; }
}

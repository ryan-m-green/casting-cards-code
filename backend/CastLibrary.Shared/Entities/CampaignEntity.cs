namespace CastLibrary.Shared.Entities;

public class CampaignEntity
{
    public Guid Id { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; }
    public string FantasyType { get; set; }
    public string Status { get; set; } = "Active";
    public string SpineColor { get; set; }
    public int LocationCount { get; set; }
    public int PlayerCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

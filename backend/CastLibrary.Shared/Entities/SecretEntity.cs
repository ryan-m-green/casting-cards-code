namespace CastLibrary.Shared.Entities;

public class CampaignSecretEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? CastInstanceId { get; set; }
    public Guid? CityInstanceId { get; set; }
    public Guid? LocationInstanceId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsRevealed { get; set; }
    public DateTime? RevealedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

namespace CastLibrary.Shared.Domain;

public class CampaignCastRelationshipDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid SourceCastInstanceId { get; set; }
    public Guid TargetCastInstanceId { get; set; }
    public int Value { get; set; }
    public string? Explanation { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

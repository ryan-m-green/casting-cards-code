namespace CastLibrary.Shared.Domain;

public class CampaignPlayerNotesDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

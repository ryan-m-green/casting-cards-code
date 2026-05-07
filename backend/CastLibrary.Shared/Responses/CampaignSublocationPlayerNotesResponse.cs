namespace CastLibrary.Shared.Responses;

public class CampaignSublocationPlayerNotesResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid SublocationInstanceId { get; set; }
    public string Notes { get; set; } = string.Empty;
}

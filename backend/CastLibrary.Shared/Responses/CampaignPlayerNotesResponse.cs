namespace CastLibrary.Shared.Responses;

public class CampaignPlayerNotesResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Notes { get; set; } = string.Empty;
}

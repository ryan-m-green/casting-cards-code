namespace CastLibrary.Shared.Responses;

public class CampaignLocationPlayerNotesResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid LocationInstanceId { get; set; }
    public string Notes { get; set; } = string.Empty;
}

namespace CastLibrary.Shared.Responses;

public class PlayerQuicknoteQueueItemResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

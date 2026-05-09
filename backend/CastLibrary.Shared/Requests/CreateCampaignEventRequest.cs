namespace CastLibrary.Shared.Requests;

public class CreateCampaignEventRequest
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public Guid? LinkedEntityId { get; set; }
    public string? LinkedEntityType { get; set; }
}

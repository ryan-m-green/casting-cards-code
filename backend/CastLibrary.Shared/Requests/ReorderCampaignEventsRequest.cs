namespace CastLibrary.Shared.Requests;

public class ReorderCampaignEventsRequest
{
    public List<Guid> EventIds { get; set; } = [];
}

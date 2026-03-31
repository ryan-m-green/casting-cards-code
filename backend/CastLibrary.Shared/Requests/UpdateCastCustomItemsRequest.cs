namespace CastLibrary.Shared.Requests;

public class UpdateCastCustomItemsRequest
{
    public List<CampaignCastCustomItemRequest> Items { get; set; } = [];
}

public record CampaignCastCustomItemRequest(string Name, string Price);

namespace CastLibrary.Shared.Requests;

public class AddSublocationToCampaignRequest
{
    public Guid SublocationId { get; set; }
    public Guid? LocationInstanceId { get; set; }
}

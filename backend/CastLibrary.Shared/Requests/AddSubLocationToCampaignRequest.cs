namespace CastLibrary.Shared.Requests;

public class AddSublocationToCampaignRequest
{
    public Guid SublocationId { get; set; }
    public Guid? CityInstanceId { get; set; }
}

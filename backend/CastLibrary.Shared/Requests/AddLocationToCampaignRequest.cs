namespace CastLibrary.Shared.Requests;

public class AddLocationToCampaignRequest
{
    public Guid LocationId { get; set; }
    public Guid? CityInstanceId { get; set; }
}

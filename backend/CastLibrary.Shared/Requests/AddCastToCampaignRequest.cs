namespace CastLibrary.Shared.Requests;
public class AddCastToCampaignRequest
{
    public Guid CastId { get; set; }
    public Guid CityInstanceId { get; set; }
    public Guid LocationInstanceId { get; set; }
}

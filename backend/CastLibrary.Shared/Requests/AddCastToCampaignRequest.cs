namespace CastLibrary.Shared.Requests;
public class AddCastToCampaignRequest
{
    public Guid CastId { get; set; }
    public Guid LocationInstanceId { get; set; }
    public Guid SublocationInstanceId { get; set; }
}


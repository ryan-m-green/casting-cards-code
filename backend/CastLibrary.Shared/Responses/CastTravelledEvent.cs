namespace CastLibrary.Shared.Responses;

public class CastTravelledEvent
{
    public Guid CampaignId { get; set; }
    public Guid CastInstanceId { get; set; }
    public Guid? FromSublocationInstanceId { get; set; }
    public Guid ToLocationInstanceId { get; set; }
    public Guid ToSublocationInstanceId { get; set; }
}

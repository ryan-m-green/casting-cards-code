namespace CastLibrary.Shared.Responses;

public class CastTraveledEvent
{
    public Guid CampaignId { get; set; }
    public Guid CastInstanceId { get; set; }
    public Guid? FromSublocationInstanceId { get; set; }
    public Guid ToLocationInstanceId { get; set; }
    public Guid ToSublocationInstanceId { get; set; }
    public bool TraveledToTheParty { get; set; }
    public bool IsVisible { get; set; }
}

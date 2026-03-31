namespace CastLibrary.Shared.Responses;

public class SecretRevealedEvent
{
    public Guid SecretId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? CastInstanceId { get; set; }
    public Guid? CityInstanceId { get; set; }
    public Guid? LocationInstanceId { get; set; }
}

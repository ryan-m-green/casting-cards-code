namespace CastLibrary.Shared.Requests;

public class UpdateCampaignEventDetailsRequest
{
    public string  Title            { get; set; } = string.Empty;
    public string  Body             { get; set; } = string.Empty;
    public string? LinkedEntityType { get; set; }
    public Guid?   LinkedEntityId   { get; set; }
    public decimal? TodPositionPercent { get; set; }
}

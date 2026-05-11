namespace CastLibrary.Shared.Requests;

public class UpdateCampaignEventVisibilityRequest
{
    public bool IsVisibleToPlayers { get; set; }
    public decimal? TodPositionPercent { get; set; }
}

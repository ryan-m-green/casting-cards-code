namespace CastLibrary.Shared.Requests;

public class UpdateCampaignRequest
{
    public string Name        { get; set; } = string.Empty;
    public string FantasyType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string SpineColor  { get; set; } = string.Empty;
}

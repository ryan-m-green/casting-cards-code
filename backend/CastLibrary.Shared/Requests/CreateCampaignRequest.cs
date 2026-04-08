namespace CastLibrary.Shared.Requests;

public class CreateCampaignRequest
{
    public string Name { get; set; } = string.Empty;
    public string FantasyType { get; set; } = "High Fantasy";
    public string Description { get; set; } = string.Empty;
    public List<Guid> LocationIds { get; set; } = [];
}

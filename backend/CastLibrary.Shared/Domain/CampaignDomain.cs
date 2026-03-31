using CastLibrary.Shared.Enums;
namespace CastLibrary.Shared.Domain;

public class CampaignDomain
{
    public Guid Id { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string FantasyType { get; set; } = string.Empty;
    public CampaignStatus Status { get; set; }
    public string SpineColor { get; set; } = string.Empty;
    public int CityCount { get; set; }
    public int PlayerCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

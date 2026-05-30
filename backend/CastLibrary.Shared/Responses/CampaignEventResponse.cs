using CastLibrary.Shared.Domain;

namespace CastLibrary.Shared.Responses;

public class CampaignEventResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<LinkedEntityTrigger> LinkedEntities { get; set; } = [];
    public bool VisibleToPlayers { get; set; }
    public string ImageUrl { get; set; }
    public decimal? TodPositionPercent { get; set; }
    public bool Archived { get; set; }
    public DateTime CreatedAt { get; set; }
}

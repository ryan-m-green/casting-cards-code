using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;
using System.Text.Json.Serialization;

namespace CastLibrary.Shared.Responses;

public class CampaignEventResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<LinkedEntityTrigger> LinkedEntities { get; set; } = [];
    [JsonPropertyName("visibleToPlayers")]
    public bool VisibleToPlayers { get; set; }
    public bool MarkedForArchive { get; set; }
    public string ImageUrl { get; set; }
    public decimal? TodPositionPercent { get; set; }
    public bool Archived { get; set; }
    public string SceneType { get; set; } = "campaign-event";
    public List<Guid> SoundtrackIds { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

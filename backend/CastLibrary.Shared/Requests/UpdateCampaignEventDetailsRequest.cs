using CastLibrary.Shared.Domain;
using System.Text.Json.Serialization;

namespace CastLibrary.Shared.Requests;

public class UpdateCampaignEventDetailsRequest
{
    public string  Title            { get; set; } = string.Empty;
    public string  Body             { get; set; } = string.Empty;
    public string  SceneType        { get; set; } = "campaign-event";
    public List<Domain.LinkedEntityTrigger> LinkedEntities { get; set; } = [];
    public decimal? TodPositionPercent { get; set; }
    [JsonPropertyName("visibleToPlayers")]
    public bool VisibleToPlayers { get; set; }
    public List<Guid> SoundtrackIds { get; set; } = [];
}

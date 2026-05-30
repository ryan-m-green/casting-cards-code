using CastLibrary.Shared.Domain;

namespace CastLibrary.Shared.Requests;

public class CreateCampaignEventRequest
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public List<Domain.LinkedEntityTrigger> LinkedEntities { get; set; } = [];
    public decimal? TodPositionPercent { get; set; }
    public bool IsVisibleToPlayers { get; set; }
}

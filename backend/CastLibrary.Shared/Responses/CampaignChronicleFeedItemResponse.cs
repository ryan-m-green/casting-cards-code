using CastLibrary.Shared.Domain;

namespace CastLibrary.Shared.Responses;

/// <summary>
/// V2 - one entry of the standalone campaign chronicle feed returned to clients.
/// </summary>
public class CampaignChronicleFeedItemResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public Guid? SourceId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<LinkedEntityTrigger> LinkedEntities { get; set; } = [];
    public string FilePath { get; set; } = string.Empty;
    public string ImageUrl { get; set; }
    public string TodSliceName { get; set; } = string.Empty;
    public bool IsGmOnly { get; set; }
    public DateTime PlayedOn { get; set; }
    public int? SessionNumber { get; set; }
    public DateTime ArchivedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string[] Keywords { get; set; } = [];
}

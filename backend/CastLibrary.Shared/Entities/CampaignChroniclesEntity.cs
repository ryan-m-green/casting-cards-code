namespace CastLibrary.Shared.Entities;

public class CampaignChroniclesEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public Guid? SourceId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string LinkedEntities { get; set; } = "[]";
    public string FilePath { get; set; } = string.Empty;
    public string TodSliceName { get; set; } = string.Empty;
    public bool IsGmOnly { get; set; }

    /// <summary>DB column is DATE, which Npgsql materialises as a DateOnly.</summary>
    public DateOnly PlayedOn { get; set; }

    public int? SessionNumber { get; set; }
    public DateTime ArchivedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string Keywords { get; set; } = string.Empty;
}

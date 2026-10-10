using CastLibrary.Shared.Enums;

namespace CastLibrary.Shared.Requests;

/// <summary>
/// Generic v2 request for adding any kind of content to the campaign chronicle feed.
/// The content_type drives which archive strategy builds the chronicle row.
/// </summary>
public class CreateChronicleRequest
{
    public ChronicleContentType ContentType { get; set; }

    /// <summary>Id of the originating content row when one exists (e.g. a storyline item).</summary>
    public Guid? SourceId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    /// <summary>
    /// When omitted the per-content strategy chooses a default
    /// (e.g. secrets default to GM-only, everything else player-visible).
    /// </summary>
    public bool? IsGmOnly { get; set; }

    public List<ChronicleParticipant> Participants { get; set; } = [];

    public string TodSliceName { get; set; } = string.Empty;

    /// <summary>Date the content belongs to. Defaults to today when omitted.</summary>
    public DateTime? PlayedOn { get; set; }

    /// <summary>Optional display label only - never used for grouping.</summary>
    public int? SessionNumber { get; set; }
}

public class ChronicleParticipant
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
}

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

    /// <summary>
    /// Card face carried by a participant that is a simple card rather than a bare name. Only the
    /// encounter archive fills these in; a plain linked card leaves them empty.
    /// </summary>
    public string EntityRole { get; set; } = string.Empty;

    public string EntityRace { get; set; } = string.Empty;

    public string EntityImageUrl { get; set; } = string.Empty;

    /// <summary>
    /// How the card finished the fight it was linked from: "defeated", "captured", "escaped", or
    /// empty when it was left standing. Empty for participants that carry no encounter outcome.
    /// </summary>
    public string EntityState { get; set; } = string.Empty;

    /// <summary>
    /// How many copies of the card the fight held (1 for a card that stood in it alone, 0 for a
    /// participant the count does not apply to).
    /// </summary>
    public int EntityCount { get; set; }
}

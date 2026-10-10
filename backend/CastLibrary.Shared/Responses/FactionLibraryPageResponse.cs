namespace CastLibrary.Shared.Responses;

/// <summary>
/// One page of a campaign's faction picker: the DM's library factions this campaign has yet to
/// hold — filtered by free text and paged server-side, so the drawer never pulls the whole
/// library down.
///
/// <see cref="LibraryCount"/> is the DM's whole faction library (added or not), which lets the
/// picker tell an empty library from one whose factions are all in the campaign already.
/// </summary>
public class FactionLibraryPageResponse
{
    public List<FactionResponse> Items { get; set; } = [];
    public int PageNumber { get; set; }
    public int PageSize { get; set; }

    /// <summary>How many factions match the current filter.</summary>
    public int TotalCount { get; set; }

    public int TotalPages { get; set; }

    /// <summary>How many factions the DM has in the library at all.</summary>
    public int LibraryCount { get; set; }
}

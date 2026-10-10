using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

/// <summary>Filter + paging parameters for the campaign's faction-library picker.</summary>
public class FactionLibraryQuery
{
    public string SearchQuery { get; init; } = string.Empty;

    /// <summary>Keywords to narrow by (matched per <see cref="MatchAll"/>).</summary>
    public string[] Keywords { get; init; } = [];

    /// <summary>True = every keyword must be present, false = any one of them.</summary>
    public bool MatchAll { get; init; }

    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 35;
}

/// <summary>
/// One page of that picker's list, with the arithmetic already done: the domains for the page,
/// how many match the filter, and how big the DM's library is in total. The web layer turns the
/// domains into responses (it owns the mapper), so this stays in the Logic layer's terms.
/// </summary>
public record FactionLibraryPage(
    List<FactionDomain> Items,
    int PageNumber,
    int PageSize,
    int TotalCount,
    int TotalPages,
    int LibraryCount);

public interface IGetCampaignFactionLibraryQueryHandler
{
    Task<FactionLibraryPage> HandleAsync(Guid campaignId, Guid dmUserId, FactionLibraryQuery query);
}

/// <summary>
/// The DM's faction library as this campaign can still use it: what the campaign already holds
/// is left out, free text narrows it by name or type, and one page of the result is returned.
/// </summary>
public class GetCampaignFactionLibraryQueryHandler(IFactionReadRepository factionReadRepository)
    : IGetCampaignFactionLibraryQueryHandler
{
    public async Task<FactionLibraryPage> HandleAsync(Guid campaignId, Guid dmUserId, FactionLibraryQuery query)
    {
        var pageNumber = Math.Max(1, query.PageNumber);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var (items, total) = await factionReadRepository.GetCampaignLibraryPageAsync(
            dmUserId, campaignId, query.SearchQuery, query.Keywords, query.MatchAll, pageNumber, pageSize);

        var libraryCount = await factionReadRepository.GetFactionCountByDmAsync(dmUserId);

        return new FactionLibraryPage(
            items,
            pageNumber,
            pageSize,
            total,
            total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize),
            libraryCount);
    }
}

// ── Keyword counts (the chip row over the picker's grid) ────────────────────────

/// <summary>A keyword the filtered factions carry, and how many of them carry it.</summary>
public record FactionKeywordCount(string Keyword, int Count);

public interface IGetCampaignFactionLibraryKeywordCountsQueryHandler
{
    Task<List<FactionKeywordCount>> HandleAsync(Guid campaignId, Guid dmUserId, FactionLibraryQuery query);
}

/// <summary>
/// The chip row over the picker's grid: the DM's own faction hashtags, each with how many of the
/// factions still to add carry it.
///
/// The DM's hashtag list is the spine of it rather than the factions' own keywords alone, because
/// it is where every faction's keywords end up anyway (creating or updating a faction merges them
/// into it) and because it is the list the DM thinks in — a hashtag they have shows up even while
/// nothing available carries it, with a count of none, instead of quietly going missing. Any
/// keyword found on a faction but not in that list is added on the end.
/// </summary>
public class GetCampaignFactionLibraryKeywordCountsQueryHandler(
    IFactionReadRepository factionReadRepository,
    ICampaignKeywordReadRepository campaignKeywordReadRepository)
    : IGetCampaignFactionLibraryKeywordCountsQueryHandler
{
    /// <summary>How many chips the row will carry at most.</summary>
    private const int MaxChips = 60;

    public async Task<List<FactionKeywordCount>> HandleAsync(
        Guid campaignId, Guid dmUserId, FactionLibraryQuery query)
    {
        var rows = await factionReadRepository.GetCampaignLibraryKeywordCountsAsync(
            dmUserId, campaignId, query.SearchQuery, query.Keywords, query.MatchAll);

        var hashtags = await campaignKeywordReadRepository.GetKeywordsAsync(dmUserId, "faction");

        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows) counts[row.Keyword] = row.Count;

        return hashtags
            .Select(keyword => new FactionKeywordCount(
                keyword, counts.TryGetValue(keyword, out var count) ? count : 0))
            .Concat(rows
                .Where(row => !hashtags.Contains(row.Keyword, StringComparer.OrdinalIgnoreCase))
                .Select(row => new FactionKeywordCount(row.Keyword, row.Count)))
            // What the current filter actually holds leads; the rest follow by name.
            .OrderByDescending(chip => chip.Count)
            .ThenBy(chip => chip.Keyword, StringComparer.Ordinal)
            .Take(MaxChips)
            .ToList();
    }
}

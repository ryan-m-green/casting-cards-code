using CastLibrary.Logic.Queries.Cast;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// v2 cast endpoints used by the encounter builder picker: a paged,
/// keyword-filtered cast index (25 cards per set) and the keyword counts that
/// drive the filter chips.
///
/// The older CastController keeps the full-library, detail and CRUD endpoints.
/// </summary>
[ApiController]
[Route("api/cast")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class v2CastsController(
    IGetCastIndexQueryHandler indexQuery,
    IGetCastKeywordCountsQueryHandler keywordCountsQuery,
    IUserRetriever userRetriever) : ControllerBase
{
    /// <summary>
    /// One set of the DM's library. <paramref name="keywords"/> is comma
    /// separated; <paramref name="keywordMode"/> is "all" or "any" (default any).
    /// </summary>
    [HttpGet("index")]
    public async Task<IActionResult> GetIndex(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string searchQuery = "",
        [FromQuery] string keywords = "",
        [FromQuery] string keywordMode = "")
    {
        var query = BuildQuery(searchQuery, keywords, keywordMode, pageNumber, pageSize);
        return Ok(await indexQuery.HandleAsync(userRetriever.GetDmUserId(User), query));
    }

    /// <summary>Keywords in the current filter, each with its cast count.</summary>
    [HttpGet("keywords")]
    public async Task<IActionResult> GetKeywords(
        [FromQuery] string searchQuery = "",
        [FromQuery] string keywords = "",
        [FromQuery] string keywordMode = "")
    {
        var query = BuildQuery(searchQuery, keywords, keywordMode, 1, 25);
        return Ok(await keywordCountsQuery.HandleAsync(userRetriever.GetDmUserId(User), query));
    }

    private static CastIndexQuery BuildQuery(
        string searchQuery, string keywords, string keywordMode, int pageNumber, int pageSize) =>
        new()
        {
            SearchQuery = searchQuery,
            Keywords = string.IsNullOrWhiteSpace(keywords)
                ? []
                : keywords.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            MatchAll = string.Equals(keywordMode, "all", StringComparison.OrdinalIgnoreCase),
            PageNumber = pageNumber,
            PageSize = pageSize,
        };
}

using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Queries.Cast;

/// <summary>Filter + paging parameters for the cast index (shared by both handlers).</summary>
public class CastIndexQuery
{
    public string SearchQuery { get; init; } = string.Empty;

    /// <summary>Keywords to require (or match any of, per <see cref="MatchAll"/>).</summary>
    public string[] Keywords { get; init; } = [];

    /// <summary>True = every keyword must be present, false = any one of them.</summary>
    public bool MatchAll { get; init; }

    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 25;
}

// ── Cast index page ─────────────────────────────────────────────────────────────

public interface IGetCastIndexQueryHandler
{
    Task<CastIndexResponse> HandleAsync(Guid dmUserId, CastIndexQuery query);
}

/// <summary>
/// One page (25 by default) of the DM's cast library for the encounter builder's
/// picker, filtered by free text and/or keywords. Only the light index fields are
/// read, and portraits are derived from the image key (never fetched per tile).
/// </summary>
public class GetCastIndexQueryHandler(
    ICastReadRepository castReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetCastIndexQueryHandler
{
    public async Task<CastIndexResponse> HandleAsync(Guid dmUserId, CastIndexQuery query)
    {
        var pageNumber = Math.Max(1, query.PageNumber);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var (items, total) = await castReadRepository.GetIndexPageByDmAsync(
            dmUserId, query.SearchQuery, query.Keywords, query.MatchAll, pageNumber, pageSize);

        return new CastIndexResponse
        {
            Items = items.Select(ToResponse).ToList(),
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = total,
            TotalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize),
        };
    }

    private CastIndexItemResponse ToResponse(CastIndexRow row)
    {
        var imageKey = imageKeyCreator.Create(row.DmUserId, Guid.Empty, row.Id, EntityType.Cast);
        return new CastIndexItemResponse
        {
            Id = row.Id,
            Name = row.Name,
            Role = row.Role,
            Race = row.Race,
            Keywords = [.. row.Keywords],
            ImageUrl = imageStorageOperator.GetPublicUrl(imageKey) ?? string.Empty,
        };
    }
}

// ── Keyword counts (the chip row) ────────────────────────────────────────────────

public interface IGetCastKeywordCountsQueryHandler
{
    Task<List<CastKeywordCountResponse>> HandleAsync(Guid dmUserId, CastIndexQuery query);
}

/// <summary>
/// Keywords present in the current filter, each with how many casts carry it, so
/// the picker can show useful chips (and their counts) instead of the whole pool.
/// </summary>
public class GetCastKeywordCountsQueryHandler(ICastReadRepository castReadRepository)
    : IGetCastKeywordCountsQueryHandler
{
    public async Task<List<CastKeywordCountResponse>> HandleAsync(Guid dmUserId, CastIndexQuery query)
    {
        var rows = await castReadRepository.GetKeywordCountsByDmAsync(
            dmUserId, query.SearchQuery, query.Keywords, query.MatchAll);

        return rows
            .Select(row => new CastKeywordCountResponse { Keyword = row.Keyword, Count = row.Count })
            .ToList();
    }
}

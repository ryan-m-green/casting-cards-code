namespace CastLibrary.Shared.Responses;

/// <summary>
/// One tile of the encounter builder's paged cast index — deliberately light:
/// just what a simple cast card needs to render.
/// </summary>
public class CastIndexItemResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Race { get; set; } = string.Empty;
    public List<string> Keywords { get; set; } = [];
    public string ImageUrl { get; set; } = string.Empty;
}

/// <summary>A page of the cast index (25 at a time by default).</summary>
public class CastIndexResponse
{
    public List<CastIndexItemResponse> Items { get; set; } = [];
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}

/// <summary>A keyword with how many casts currently carry it (chip row counts).</summary>
public class CastKeywordCountResponse
{
    public string Keyword { get; set; } = string.Empty;
    public int Count { get; set; }
}

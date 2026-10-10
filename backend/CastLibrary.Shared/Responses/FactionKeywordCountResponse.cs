namespace CastLibrary.Shared.Responses;

/// <summary>A keyword the filtered factions carry, and how many of them carry it (the chip row).</summary>
public class FactionKeywordCountResponse
{
    public string Keyword { get; set; } = string.Empty;
    public int Count { get; set; }
}

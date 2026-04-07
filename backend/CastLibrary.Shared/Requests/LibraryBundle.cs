namespace CastLibrary.Shared.Requests;

public class LibraryBundle
{
    public List<CastCard> Casts { get; set; } = [];
    public List<CityCard> Cities { get; set; } = [];
    public List<SublocationCard> Sublocations { get; set; } = [];
}

public class CastCard
{
    public string Name { get; set; } = string.Empty;
    public string Pronouns { get; set; } = string.Empty;
    public string Race { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Age { get; set; } = string.Empty;
    public string Alignment { get; set; } = string.Empty;
    public string Posture { get; set; } = string.Empty;
    public string Speed { get; set; } = string.Empty;
    public string[] VoicePlacement { get; set; } = [];
    public string Description { get; set; } = string.Empty;
    public string PublicDescription { get; set; } = string.Empty;
    public string? ImageFileName { get; set; }
}

public class CityCard
{
    public string Name { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Condition { get; set; } = string.Empty;
    public string Geography { get; set; } = string.Empty;
    public string Architecture { get; set; } = string.Empty;
    public string Climate { get; set; } = string.Empty;
    public string Religion { get; set; } = string.Empty;
    public string Vibe { get; set; } = string.Empty;
    public string Languages { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageFileName { get; set; }
}

public class SublocationCard
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageFileName { get; set; }
    public List<ShopItemCard> ShopItems { get; set; } = [];
}

public class ShopItemCard
{
    public string Name { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

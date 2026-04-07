namespace CastLibrary.Shared.Domain;

public class LocationDomain
{
    public Guid Id { get; set; }
    public Guid? CityId { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public List<ShopItemDomain> ShopItems { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

public class ShopItemDomain
{
    public Guid Id { get; set; }
    public Guid LocationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsScratchedOff { get; set; }
}
